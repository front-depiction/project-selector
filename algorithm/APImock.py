import csv
import io
from typing import List, Dict, Any, Tuple
import json

NUM_TEAMS = 3
NUM_AGENTS = 15
AGENTS_PER_TEAM = 5
#first array is agent pref for agent 1, with team 0 being rank 1 and team 2 being rank 3
PREFERENCES = [
    [1, 0, 2],
    [1, 0, 2],
    [2, 1, 0],
    [0, 2, 1],
    [1, 2, 0],
    [2, 0, 1],
    [1, 0, 2],
    [1, 0, 2],
    [2, 1, 0],
    [1, 2, 0],
    [1, 2, 0],
    [2, 0, 1],
    [0, 1, 2],
    [1, 0, 2],
    [2, 1, 0], ]

'''AGENT_ATTRIBUTES = [[1, 0],
    [1, 1],
    [0, 1],
    [0, 1],
    [0, 0],
    [0, 1],
    [0, 1],
    [0, 1],
    [0, 1],
    [0, 1],
    [1, 1],
    [0, 1],
    [0, 0],
    [1, 0],
    [1, 0],]'''

AGENT_ATTRIBUTES = [0,1,1,1,0,0,0,0,0,0,0,0,0,0,0]


json_str2 = """{
    "kind": "hard",
    "rule": {
        "op": "includes",
        "key": "attributes",
        "value": true,
        "min": 1,
        "max": 5
    }
}"""

json_str3 = """{
    "kind": "hard",
    "rule": {
        "op": "equals",
        "key": "attributes",
        "value": true
    }
}"""

json_str = """{
        "kind": "soft",
        "key": "attributes",
        "mode": "attractive",
        "weight": 0
    }"""

AGENT_DATA = List[Dict[str, Any]]

def set_agent_data(agent_data: List[Dict[str, Any]], preferences: List[List[int]], attributes: List[List[int]]) -> None:
        for i, pref_list in enumerate(preferences):
            attribute_temp = {f"attribute_{j}": value for j, value in enumerate(attributes)}
            new_agent = {
                "id": i,
                "preferences": pref_list,
                "attributes": attributes[i]
            }

            # Append the new dictionary to the AGENT_DATA list
            agent_data.append(new_agent)

def get_APIdata() -> Tuple[int, int, int, AGENT_DATA]:
    AGENT_DATA = []
    set_agent_data(AGENT_DATA, PREFERENCES, AGENT_ATTRIBUTES)
    print("\nAGENT_DATA_BASIC (successfully unpacked):")
    for agent in AGENT_DATA:
        print(agent)
    print(f"\nTotal agents in basic data (must be {NUM_AGENTS}): {len(AGENT_DATA)}")
    return NUM_TEAMS, NUM_AGENTS, AGENTS_PER_TEAM, AGENT_DATA, json_str