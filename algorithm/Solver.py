from ortools.sat.python import cp_model
from APImock import get_APIdata
from fullConstParser import parse_constraints, add_soft_constraints_to_objective
NUM_TEAMS, NUM_AGENTS, AGENTS_PER_TEAM, AGENT_DATA, HardConst = get_APIdata()
PREFERENCES = [agent['preferences'] for agent in AGENT_DATA]

# acts as main for now, the line above this is getting dummy values through 
#"get_APIdata" which returns some hardcoded dummy data

model = cp_model.CpModel()

def solve_group_assignment():
    model = cp_model.CpModel()


# function that creates a regret dictionnary structered as such: regret(agent, team) = regret
# regret is calulcated as the rank the agent ranked a group as, their first choice is regret 0, second choice regret 1, etc, etc
regret = {}
for a in range(NUM_AGENTS):
    for rank, team in enumerate(PREFERENCES[a]):
        regret[(a, team)] = rank


# decision variables, since CP-SAT is a SAT solver it uses Booleans values
# this means we create n agents * m teams boolean entries in the x dictionnary
# which each entry being something like a3_t1, agent 3 for team 1, can be true or false
# its a binary assignment table
x = {}
for a in range(NUM_AGENTS):
    for t in range(NUM_TEAMS):
        x[(a, t)] = model.NewBoolVar(f"a{a}_t{t}")


# Constraint (basic, hard): each agent assigned to exactly one team
# x(a,t) is either 0 or 1, so that means for 3 teams x(a3, t1) + x(a3, t2) + x(a3, t3) = 1
for a in range(NUM_AGENTS):
    model.Add(sum(x[(a, t)] for t in range(NUM_TEAMS)) == 1)


# Constraint (basic, hard, might be changed later for more flexibility (?)):
# each team must have exactly AGENTS_PER_TEAM agents
for t in range(NUM_TEAMS):
    model.Add(sum(x[(a, t)] for a in range(NUM_AGENTS)) == AGENTS_PER_TEAM)

# constraints (custom, hard)
'''for t in range(NUM_TEAMS):
    #golabs and locals to pass current variables
    try:
        exec(HardConst, globals(), locals())
        #model.Add(sum(x[(a, t)] for a in range(NUM_AGENTS) if AGENT_DATA[a]["attributes"]) == 1)
        
        print(f"Constraint successfully added for t = {t}")
    except Exception as e:
        print(f"Error executing constraint for t = {t}: {e}")'''

result = parse_constraints(HardConst, model, x, PREFERENCES, AGENT_DATA, NUM_AGENTS, NUM_TEAMS)
add_soft_constraints_to_objective(model, x, PREFERENCES, AGENT_DATA, NUM_AGENTS, NUM_TEAMS, result['soft_constraints'], 1.0)

# solve lol
solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 5
result = solver.Solve(model)

# display result
if result in (cp_model.OPTIMAL, cp_model.FEASIBLE):
    print("\n ------ SOLVER ------ \n")
    print("Solution found:")
    total_regret = 0
    for t in range(NUM_TEAMS):
        members = []
        team_regret = 0
        for a in range(NUM_AGENTS):
            if solver.Value(x[(a, t)]) == 1:
                members.append(a)
                agent_regret = PREFERENCES[a].index(t)
                team_regret += agent_regret
                total_regret += agent_regret
        
        print(f"Group {t}: {members} (regret: {team_regret})\n")
    print(f"Total regret : {total_regret}\n")
else:
    print("No feasible solution found :(")


if __name__ == "__main__":
    solve_group_assignment()