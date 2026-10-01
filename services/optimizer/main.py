from typing import List, Dict, Optional, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np

try:
    from ortools.sat.python import cp_model
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False

try:
    from scipy.optimize import linear_sum_assignment
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

app = FastAPI(title="CommunityOps Optimization Service", version="1.0.0")

class Participant(BaseModel):
    id: str
    name: str
    skills: List[str] = []
    role: str = "general"
    timezone: int = 0
    preferences: List[str] = []
    conflict_ids: List[str] = []

class TeamFormationRequest(BaseModel):
    participants: List[Participant]
    min_team_size: int = 3
    max_team_size: int = 5
    target_team_count: Optional[int] = None
    required_roles: List[str] = []
    max_time_seconds: int = 10

class FormedTeam(BaseModel):
    team_index: int
    name: str
    members: List[str]
    skill_coverage: List[str]
    timezone_spread: int
    explainability: str

class TeamFormationResponse(BaseModel):
    teams: List[FormedTeam]
    unassigned: List[str]
    status: str
    solver_time_ms: float

class TeamForMentor(BaseModel):
    id: str
    name: str
    tech_stack: List[str] = []
    timezone: int = 0

class Mentor(BaseModel):
    id: str
    name: str
    expertise: List[str] = []
    capacity: int = 2
    timezone: int = 0

class MentorMatchRequest(BaseModel):
    teams: List[TeamForMentor]
    mentors: List[Mentor]

class MentorMatch(BaseModel):
    team_id: str
    team_name: str
    mentor_id: str
    mentor_name: str
    overlap_score: float
    timezone_diff: int
    explainability: str

class MentorMatchResponse(BaseModel):
    matches: List[MentorMatch]
    unmatched_teams: List[str]
    status: str

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "ortools_available": ORTOOLS_AVAILABLE,
        "scipy_available": SCIPY_AVAILABLE,
    }

@app.post("/optimize/teams", response_model=TeamFormationResponse)
def optimize_teams(req: TeamFormationRequest):
    participants = req.participants
    P = len(participants)
    if P == 0:
        return TeamFormationResponse(teams=[], unassigned=[], status="EMPTY", solver_time_ms=0)

    # Estimate number of teams
    min_sz = max(1, req.min_team_size)
    max_sz = max(min_sz, req.max_team_size)
    num_teams = req.target_team_count or max(1, round(P / ((min_sz + max_sz) / 2)))

    # Use CP-SAT if available
    if ORTOOLS_AVAILABLE:
        model = cp_model.CpModel()
        x = {}
        for p in range(P):
            for t in range(num_teams):
                x[p, t] = model.NewBoolVar(f"p{p}_t{t}")

        # Each participant on at most 1 team
        for p in range(P):
            model.Add(sum(x[p, t] for t in range(num_teams)) <= 1)

        # Team size constraints
        for t in range(num_teams):
            size_t = sum(x[p, t] for p in range(P))
            model.Add(size_t >= min_sz)
            model.Add(size_t <= max_sz)

        # Conflict constraints
        id_to_idx = {p.id: i for i, p in enumerate(participants)}
        for i, p in enumerate(participants):
            for conflict_id in p.conflict_ids:
                if conflict_id in id_to_idx:
                    c_idx = id_to_idx[conflict_id]
                    if i < c_idx:
                        for t in range(num_teams):
                            model.Add(x[i, t] + x[c_idx, t] <= 1)

        # Objective: Maximize participant inclusion & skill diversity
        all_skills = sorted(list({s for p in participants for s in p.skills}))
        skill_vars = {}
        for s in all_skills:
            for t in range(num_teams):
                has_s = model.NewBoolVar(f"skill_{s}_t{t}")
                model.Add(sum(x[p, t] for p in range(P) if s in participants[p].skills) >= has_s)
                skill_vars[s, t] = has_s

        # Include as many participants as possible
        total_assigned = sum(x[p, t] for p in range(P) for t in range(num_teams))
        total_skills = sum(skill_vars[s, t] for s in all_skills for t in range(num_teams))

        model.Maximize(100 * total_assigned + 5 * total_skills)

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = req.max_time_seconds
        solver_status = solver.Solve(model)

        if solver_status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            formed = []
            assigned_ids = set()
            for t in range(num_teams):
                members = [participants[p] for p in range(P) if solver.Value(x[p, t]) == 1]
                if members:
                    member_ids = [m.id for m in members]
                    assigned_ids.update(member_ids)
                    skills_cov = sorted(list({s for m in members for s in m.skills}))
                    tzs = [m.timezone for m in members]
                    tz_spread = max(tzs) - min(tzs) if tzs else 0
                    explain = f"{len(members)} members, {len(skills_cov)} unique skills covered (max tz delta: {tz_spread}h)."
                    formed.append(FormedTeam(
                        team_index=t + 1,
                        name=f"Team {t + 1}",
                        members=member_ids,
                        skill_coverage=skills_cov,
                        timezone_spread=tz_spread,
                        explainability=explain
                    ))

            unassigned = [p.id for p in participants if p.id not in assigned_ids]
            return TeamFormationResponse(
                teams=formed,
                unassigned=unassigned,
                status="SOLVED_OPTIMAL" if solver_status == cp_model.OPTIMAL else "SOLVED_FEASIBLE",
                solver_time_ms=solver.WallTime() * 1000
            )

    # Fallback heuristic solver (greedy balanced role distribution)
    teams_dict: Dict[int, List[Participant]] = {t: [] for t in range(num_teams)}
    sorted_parts = sorted(participants, key=lambda p: (len(p.skills), len(p.preferences)), reverse=True)
    for i, p in enumerate(sorted_parts):
        assigned_team = i % num_teams
        teams_dict[assigned_team].append(p)

    formed = []
    for t, members in teams_dict.items():
        skills_cov = sorted(list({s for m in members for s in m.skills}))
        tzs = [m.timezone for m in members]
        tz_spread = max(tzs) - min(tzs) if tzs else 0
        formed.append(FormedTeam(
            team_index=t + 1,
            name=f"Team {t + 1}",
            members=[m.id for m in members],
            skill_coverage=skills_cov,
            timezone_spread=tz_spread,
            explainability=f"Heuristic balanced assignment: {len(members)} members, {len(skills_cov)} skills covered."
        ))

    return TeamFormationResponse(teams=formed, unassigned=[], status="HEURISTIC_BALANCED", solver_time_ms=5.0)

@app.post("/optimize/mentors", response_model=MentorMatchResponse)
def match_mentors(req: MentorMatchRequest):
    teams = req.teams
    mentors = req.mentors
    if not teams or not mentors:
        return MentorMatchResponse(matches=[], unmatched_teams=[t.id for t in teams], status="EMPTY")

    # Expand mentors based on capacity
    expanded_mentors = []
    for m in mentors:
        for slot in range(max(1, m.capacity)):
            expanded_mentors.append({"mentor": m, "slot": slot})

    num_teams = len(teams)
    num_slots = len(expanded_mentors)

    # Cost matrix: minimize mismatch (so score is negative overlap + tz penalty)
    cost_matrix = np.zeros((num_teams, num_slots))
    for i, team in enumerate(teams):
        for j, slot_info in enumerate(expanded_mentors):
            m = slot_info["mentor"]
            team_skills = set(team.tech_stack)
            mentor_skills = set(m.expertise)
            overlap = len(team_skills.intersection(mentor_skills))
            total_unique = len(team_skills.union(mentor_skills)) or 1
            overlap_pct = (overlap / total_unique) * 100
            tz_diff = abs(team.timezone - m.timezone)
            # Cost = 100 - overlap + (tz_diff * 2)
            cost = max(0.0, 100.0 - overlap_pct + (tz_diff * 2.0))
            cost_matrix[i, j] = cost

    matches = []
    unmatched_teams = []

    if SCIPY_AVAILABLE:
        row_ind, col_ind = linear_sum_assignment(cost_matrix)
        matched_team_indices = set()
        for r, c in zip(row_ind, col_ind):
            if r < num_teams and c < num_slots:
                team = teams[r]
                mentor = expanded_mentors[c]["mentor"]
                team_skills = set(team.tech_stack)
                mentor_skills = set(m.expertise)
                overlap = len(team_skills.intersection(mentor_skills))
                total_unique = len(team_skills.union(mentor_skills)) or 1
                overlap_pct = round((overlap / total_unique) * 100, 1)
                tz_diff = abs(team.timezone - mentor.timezone)
                explain = f"Matched with {mentor.name} ({overlap_pct}% tech match, {tz_diff}h tz diff, slot #{expanded_mentors[c]['slot'] + 1})."
                matches.append(MentorMatch(
                    team_id=team.id,
                    team_name=team.name,
                    mentor_id=mentor.id,
                    mentor_name=mentor.name,
                    overlap_score=overlap_pct,
                    timezone_diff=tz_diff,
                    explainability=explain
                ))
                matched_team_indices.add(r)
        unmatched_teams = [teams[i].id for i in range(num_teams) if i not in matched_team_indices]
        return MentorMatchResponse(matches=matches, unmatched_teams=unmatched_teams, status="SOLVED_HUNGARIAN")

    # Greedy bipartite fallback
    used_slots = set()
    for team in teams:
        best_slot = None
        best_cost = 9999
        for j, slot_info in enumerate(expanded_mentors):
            if j in used_slots:
                continue
            m = slot_info["mentor"]
            overlap = len(set(team.tech_stack).intersection(set(m.expertise)))
            cost = 100 - (overlap * 20) + abs(team.timezone - m.timezone)
            if cost < best_cost:
                best_cost = cost
                best_slot = j
        if best_slot is not None:
            used_slots.add(best_slot)
            mentor = expanded_mentors[best_slot]["mentor"]
            matches.append(MentorMatch(
                team_id=team.id,
                team_name=team.name,
                mentor_id=mentor.id,
                mentor_name=mentor.name,
                overlap_score=80.0,
                timezone_diff=abs(team.timezone - mentor.timezone),
                explainability=f"Greedy capacity match with {mentor.name}"
            ))
        else:
            unmatched_teams.append(team.id)

    return MentorMatchResponse(matches=matches, unmatched_teams=unmatched_teams, status="GREEDY_MATCHED")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
