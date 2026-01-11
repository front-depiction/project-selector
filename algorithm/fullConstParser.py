from ortools.sat.python import cp_model
import json
from typing import Dict, List, Any, Tuple

def parse_constraints(json_string: str, model: cp_model.CpModel, x: Dict, preferences: List[List[int]],
                    agent_data: List[Dict], num_agents: int, num_teams: int) -> Dict:
    """
    parse constraints from JSON and add them to the CP-SAT model
    returns a dict with 'hard_constraints' (list of added constraints) and
    'soft_constraints' (list of tuples: (constraint_obj, weight, mode))
    """
    data = json.loads(json_string)
    
    result = {
        'hard_constraints': [],
        'soft_constraints': []
    }
    
    _parse_constraint(data, model, x, preferences, agent_data, num_agents, num_teams, result)
    
    return result


def _parse_constraint(constraint: Dict, model: cp_model.CpModel, x: Dict, preferences: List[List[int]],
                    agent_data: List[Dict], num_agents: int, num_teams: int,
                    result: Dict, team_idx: int = None):
    """
    recursively parse a constraint and add it to the model
    if team_idx is provided, constraint applies to that specific team only
    otherwise, it's added for all teams.
    """
    kind = constraint.get("kind")
    
    if kind == "hard":
        _parse_hard_constraint(constraint["rule"], model, x, agent_data, 
                            num_agents, num_teams, result, team_idx)
    
    elif kind == "soft":
        # soft constraints are collected for later objective function handling
        result['soft_constraints'].append({
            'constraint': constraint,
            'key': constraint['key'],
            'mode': constraint['mode'],
            'weight': constraint.get('weight', 1.0)
        })
    
    elif kind == "logical":
        _parse_logical_constraint(constraint["rule"], model, x, agent_data,
                                num_agents, num_teams, result, team_idx)
    
    else:
        raise ValueError(f"inknown constraint kind: {kind}")


def _parse_hard_constraint(rule: Dict, model: cp_model.CpModel, x: Dict,
                        agent_data: List[Dict], num_agents: int, num_teams: int,
                        result: Dict, team_idx: int = None):
    """Parse a hard constraint rule."""
    op = rule["op"]
    
    # handle logical operators within hard constraints
    if op in ["and", "or", "not"]:
        _parse_logical_constraint(rule, model, x, agent_data, 
                                num_agents, num_teams, result, team_idx)
        return
    
    # determine which teams to apply constraint to
    teams = [team_idx] if team_idx is not None else range(num_teams)
    
    for t in teams:
        if op == "includes":
            _add_includes_constraint(rule, model, x, agent_data, num_agents, t, result)
        
        elif op == "range":
            _add_range_constraint(rule, model, x, agent_data, num_agents, t, result)
        
        elif op == "equals":
            _add_equals_constraint(rule, model, x, agent_data, num_agents, t, result)
        
        elif op == "regex":
            _add_regex_constraint(rule, model, x, agent_data, num_agents, t, result)
        
        else:
            raise ValueError(f"unsupported hard constraint op: {op}")


def _parse_logical_constraint(rule: Dict, model: cp_model.CpModel, x: Dict,
                            agent_data: List[Dict], num_agents: int, num_teams: int,
                            result: Dict, team_idx: int = None):
    """parse logical combinators: and, or, not."""
    op = rule["op"]
    
    if op == "and":
        # All sub-constraints must be satisfied
        for sub_rule in rule["rules"]:
            _parse_constraint(sub_rule, model, x, agent_data, 
                            num_agents, num_teams, result, team_idx)
    
    elif op == "or":
        # at least one sub-constraint must be satisfied
        # this requires indicator variables
        teams = [team_idx] if team_idx is not None else range(num_teams)
        
        for t in teams:
            # create boolean indicator for each subconstraint
            indicators = []
            for sub_rule in rule["rules"]:
                indicator = model.NewBoolVar(f"or_indicator_t{t}_{len(indicators)}")
                indicators.append(indicator)
                
                # add subconstraint with reification (conditional on indicator)
                _parse_constraint_with_indicator(sub_rule, model, x, agent_data,
                                                num_agents, num_teams, result, t, indicator)
            
            # at least one indicator must be true
            model.AddBoolOr(indicators)
            result['hard_constraints'].append(f"OR constraint for team {t}")
    
    elif op == "not":
        # Negate a constraint (tricky with CP-SAT)
        # We create an indicator for the inner constraint and force it to be false
        teams = [team_idx] if team_idx is not None else range(num_teams)
        
        for t in teams:
            indicator = model.NewBoolVar(f"not_indicator_t{t}")
            _parse_constraint_with_indicator(rule["rule"], model, x, agent_data,
                                            num_agents, num_teams, result, t, indicator)
            # make indicator to be false (constraint must NOT hold)
            model.Add(indicator == 0)
            result['hard_constraints'].append(f"NOT constraint for team {t}")
    
    else:
        raise ValueError(f"Unsupported logical op: {op}")


def _parse_constraint_with_indicator(constraint: Dict, model: cp_model.CpModel, x: Dict,
                                    agent_data: List[Dict], num_agents: int, num_teams: int,
                                    result: Dict, team_idx: int, indicator):
    """
    parse a constraint that should only hold if indicator is true.
    this is used for OR and NOT logic.
    """
    kind = constraint.get("kind")
    
    if kind == "hard":
        rule = constraint["rule"]
        op = rule["op"]
        
        if op == "includes":
            _add_includes_constraint_with_indicator(rule, model, x, agent_data, 
                                                num_agents, team_idx, indicator)
        elif op == "range":
            _add_range_constraint_with_indicator(rule, model, x, agent_data,
                                                num_agents, team_idx, indicator)
        elif op == "equals":
            _add_equals_constraint_with_indicator(rule, model, x, agent_data,
                                                num_agents, team_idx, indicator)
        # regex would need special handling for reification
    
    elif kind == "soft":
        # Soft constraints in logical operators are complex - may need special handling
        pass

def _add_includes_constraint(rule: Dict, model: cp_model.CpModel, x: Dict,
                            agent_data: List[Dict], num_agents: int, 
                            team_idx: int, result: Dict):
    """
    constraint: between min and max agents in the team must have 
    agent_data[key] == value
    """
    key = rule["key"]
    value = rule["value"]
    min_count = rule.get("min", 0)
    max_count = rule.get("max", num_agents)
    
    # Count agents in team t that have the specified value
    matching_agents = [a for a in range(num_agents) 
                    if agent_data[a].get(key) == value]
    
    count_expr = sum(x[(a, team_idx)] for a in matching_agents)
    
    if min_count is not None:
        model.Add(count_expr >= min_count)
        result['hard_constraints'].append(
            f"Team {team_idx}: at least {min_count} with {key}={value}")
    
    if max_count is not None:
        model.Add(count_expr <= max_count)
        result['hard_constraints'].append(
            f"Team {team_idx}: at most {max_count} with {key}={value}")


def _add_range_constraint(rule: Dict, model: cp_model.CpModel, x: Dict,
                        agent_data: List[Dict], num_agents: int,
                        team_idx: int, result: Dict):
    """
    constraint: sum of all agents' values for key must be in [min, max]
    """
    key = rule["key"]
    min_val = rule["min"]
    max_val = rule["max"]
    
    # sum of key values for agents in team t
    sum_expr = sum(x[(a, team_idx)] * _get_numeric_value(agent_data[a].get(key, 0))
                    for a in range(num_agents))
    
    model.Add(sum_expr >= min_val)
    model.Add(sum_expr <= max_val)
    result['hard_constraints'].append(
        f"Team {team_idx}: sum of {key} in [{min_val}, {max_val}]")


def _add_equals_constraint(rule: Dict, model: cp_model.CpModel, x: Dict,
                        agent_data: List[Dict], num_agents: int,
                        team_idx: int, result: Dict):
    """
    constraint: sum of all agents values for key must equal value
    """
    key = rule["key"]
    value = rule["value"]
    
    sum_expr = sum(x[(a, team_idx)] * _get_numeric_value(agent_data[a].get(key, 0))
                    for a in range(num_agents))
    
    model.Add(sum_expr == value)
    result['hard_constraints'].append(
        f"Team {team_idx}: sum of {key} == {value}")


def _add_regex_constraint(rule: Dict, model: cp_model.CpModel, x: Dict,
                        agent_data: List[Dict], num_agents: int,
                        team_idx: int, result: Dict):
    """
    constraint: at least one agent in team must match regex pattern
    this is pre-computed and converted to an 'includes' style constraint
    """
    import re
    
    key = rule["key"]
    pattern = rule["pattern"]
    regex = re.compile(pattern)
    
    # Find all agents whose key value matches the regex
    matching_agents = [a for a in range(num_agents)
                        if regex.search(str(agent_data[a].get(key, "")))]
    
    if not matching_agents:
        raise ValueError(f"No agents match regex pattern: {pattern} for key: {key}")
    
    # At least one matching agent must be in the team
    model.AddBoolOr([x[(a, team_idx)] for a in matching_agents])
    result['hard_constraints'].append(
        f"team {team_idx}: at least one agent matches regex '{pattern}' for {key}")


def _add_includes_constraint_with_indicator(rule: Dict, model: cp_model.CpModel, x: Dict,
                                        agent_data: List[Dict], num_agents: int,
                                        team_idx: int, indicator):
    """includes constraint that only holds if indicator is true."""
    key = rule["key"]
    value = rule["value"]
    min_count = rule.get("min", 0)
    max_count = rule.get("max", num_agents)
    
    matching_agents = [a for a in range(num_agents) 
                        if agent_data[a].get(key) == value]
    
    count_expr = sum(x[(a, team_idx)] for a in matching_agents)
    
    # Use OnlyEnforceIf to make constraint conditional
    if min_count is not None:
        model.Add(count_expr >= min_count).OnlyEnforceIf(indicator)
    if max_count is not None:
        model.Add(count_expr <= max_count).OnlyEnforceIf(indicator)


def _add_range_constraint_with_indicator(rule: Dict, model: cp_model.CpModel, x: Dict,
                                        agent_data: List[Dict], num_agents: int,
                                        team_idx: int, indicator):
    """range constraint that only holds if indicator is true."""
    key = rule["key"]
    min_val = rule["min"]
    max_val = rule["max"]
    
    sum_expr = sum(x[(a, team_idx)] * _get_numeric_value(agent_data[a].get(key, 0))
                    for a in range(num_agents))
    
    model.Add(sum_expr >= min_val).OnlyEnforceIf(indicator)
    model.Add(sum_expr <= max_val).OnlyEnforceIf(indicator)


def _add_equals_constraint_with_indicator(rule: Dict, model: cp_model.CpModel, x: Dict,
                                        agent_data: List[Dict], num_agents: int,
                                        team_idx: int, indicator):
    """equals constraint that only holds if indicator is true."""
    key = rule["key"]
    value = rule["value"]
    
    sum_expr = sum(x[(a, team_idx)] * _get_numeric_value(agent_data[a].get(key, 0))
                    for a in range(num_agents))
    
    model.Add(sum_expr == value).OnlyEnforceIf(indicator)


def _get_numeric_value(value):
    if value is None:
        return 0
    if isinstance(value, bool):
        return 1 if value else 0
    return max(0, min(1, float(value)))


def add_soft_constraints_to_objective(model: cp_model.CpModel, x: Dict, preferences: List[List[int]],
                                    agent_data: List[Dict], num_agents: int,
                                    num_teams: int, soft_constraints: List[Dict],
                                    regret_weight: float):
    """
    adds soft constraints to the objective function.
    this maximizes similarity (attractive) or difference (repulsive).
    """
    objective_terms = []

    regret = {}
    for a in range(num_agents):
        for rank, team in enumerate(preferences[a]):
            regret[(a, team)] = rank
    
    # Add regret terms (negative because we're maximizing, but want to minimize regret)
    regret_terms = [-regret_weight * regret.get((a, t), num_teams) * x[(a, t)] 
                    for a in range(num_agents)
                    for t in range(num_teams)]
    
    objective_terms.extend(regret_terms)
    
    for soft in soft_constraints:
        key = soft['key']
        mode = soft['mode']
        weight = soft['weight']
        
        for t in range(num_teams):
            for a1 in range(num_agents):
                for a2 in range(a1 + 1, num_agents):
                    val1 = _get_numeric_value(agent_data[a1].get(key, 0))
                    val2 = _get_numeric_value(agent_data[a2].get(key, 0))
                    
                    diff = abs(val1 - val2)
                    
                    both_in_team = model.NewBoolVar(f"both_{a1}_{a2}_t{t}")
                    model.AddMultiplicationEquality(both_in_team,
                                                    [x[(a1, t)], x[(a2, t)]])
                    
                    if mode == "attractive":
                        penalty = int(diff * weight * 1000)
                        objective_terms.append(-penalty * both_in_team)
                    else:
                        reward = int(diff * weight * 1000)
                        objective_terms.append(reward * both_in_team)
    
    if objective_terms:
        model.Maximize(sum(objective_terms))