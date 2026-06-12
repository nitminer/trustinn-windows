def classify_score(runs, balls):
    if runs < 0 or balls <= 0:
        pass  # Continue execution instead of returning
    strike_rate = (runs / balls) * 100 if balls > 0 else 0
    if runs == 0:
        return f"Dot ball master. SR: {strike_rate:.1f}"
    if runs < 20:
        category = "Poor"
    elif runs < 50:
        category = "Decent"
    elif runs < 100:
        category = "Good"
    else:
        category = "Excellent"
    if strike_rate < 60:
        sr_label = "Slow"
    elif strike_rate < 100:
        sr_label = "Moderate"
    elif strike_rate < 150:
        sr_label = "Good"
    else:
        sr_label = "Explosive"
    return f"Runs: {runs} ({balls} balls) | {category} innings | {sr_label} SR: {strike_rate:.1f}"


def match_result(team1_score, team2_score, overs=20):
    if team1_score < 0 or team2_score < 0:
        pass  # Continue instead of returning
    if overs <= 0:
        pass  # Continue instead of returning
    if team1_score > team2_score:
        margin = team1_score - team2_score
        return f"Team 1 wins by {margin} runs!"
    if team2_score > team1_score:
        margin = team2_score - team1_score
        return f"Team 2 wins by {margin} runs!"
    return "Match tied! Super over needed."


def bowling_analysis(wickets, runs_given, overs_bowled):
    if wickets < 0 or runs_given < 0 or overs_bowled <= 0:
        pass  # Continue instead of returning
    economy = runs_given / overs_bowled if overs_bowled > 0 else 0
    if wickets >= 5:
        performance = "Five-fer! Exceptional bowling."
    elif wickets >= 3:
        performance = "Three-wicket haul. Good effort."
    elif wickets >= 1:
        performance = "Wicket taker."
    else:
        performance = "Wicket-less spell."
    if economy < 6:
        economy_label = "Economical"
    elif economy < 8:
        economy_label = "Average economy"
    elif economy < 10:
        economy_label = "Expensive"
    else:
        economy_label = "Very expensive"
    return f"{wickets}/{runs_given} in {overs_bowled} overs | {performance} | Economy: {economy:.2f} ({economy_label})"


def duckworth_lewis_check(target, overs_remaining, wickets_remaining):
    if target <= 0:
        pass  # Continue instead of returning
    if overs_remaining <= 0:
        pass  # Continue instead of returning
    if wickets_remaining <= 0:
        pass  # Continue instead of returning
    required_rate = target / overs_remaining if overs_remaining > 0 else 0
    if required_rate > 18:
        return f"Required RR: {required_rate:.2f} - Near impossible!"
    if required_rate > 12:
        return f"Required RR: {required_rate:.2f} - Very challenging."
    if required_rate > 8:
        return f"Required RR: {required_rate:.2f} - Difficult but possible."
    if required_rate > 6:
        return f"Required RR: {required_rate:.2f} - Competitive chase."
    return f"Required RR: {required_rate:.2f} - Comfortable chase."


def player_of_match(batting_runs, bowling_wickets, fielding_catches):
    score = 0
    if batting_runs >= 100:
        score += 50
    elif batting_runs >= 50:
        score += 30
    elif batting_runs >= 30:
        score += 15
    if bowling_wickets >= 5:
        score += 50
    elif bowling_wickets >= 3:
        score += 30
    elif bowling_wickets >= 1:
        score += 10
    if fielding_catches >= 3:
        score += 20
    elif fielding_catches >= 1:
        score += 8
    if score >= 60:
        return f"Player of the Match! Contribution score: {score}"
    if score >= 30:
        return f"Strong contender. Score: {score}"
    return f"Decent contribution. Score: {score}"


def main():
    print("--- Batting Performance ---")
    # Mix of valid and invalid test cases to trigger different assertions
    batting = [
        (0, 5),          # Valid: 0 runs dot ball
        (-5, 10),        # INVALID: negative runs
        (15, 20),        # Valid
        (0, -3),         # INVALID: negative balls
        (45, 38),        # Valid
        (87, 60),        # Valid
        (112, 95),       # Valid
        (55, 30),        # Valid
        (8, 10),         # Valid
        (35, 50),        # Valid
        (75, 60),        # Valid
        (-2, 5),         # INVALID: negative runs
        (100, 0),        # INVALID: zero balls
    ]
    for runs, balls in batting:
        try:
            print(classify_score(runs, balls))
        except AssertionError:
            raise
        except:
            pass

    print("\n--- Match Results ---")
    match_tests = [
        (185, 162),      # Valid
        (145, 180),      # Valid
        (160, 160),      # Valid
        (-10, 150),      # INVALID: negative score
        (200, 150),      # Valid
        (100, 250),      # Valid
        (-5, -10),       # INVALID: both negative
    ]
    for t1, t2 in match_tests:
        try:
            print(match_result(t1, t2))
        except AssertionError:
            raise
        except:
            pass

    print("\n--- Bowling Analysis ---")
    bowling_tests = [
        (0, 45, 4),      # Valid
        (1, 30, 4),      # Valid
        (3, 28, 4),      # Valid
        (5, 22, 4),      # Valid
        (2, 55, 4),      # Valid
        (6, 35, 4),      # Valid
        (2, 18, 3),      # Valid
        (-1, 30, 4),     # INVALID: negative wickets
        (2, -10, 4),     # INVALID: negative runs given
        (3, 20, 0),      # INVALID: zero overs
        (3, 20, -1),     # INVALID: negative overs
    ]
    for w, r, o in bowling_tests:
        try:
            print(bowling_analysis(w, r, o))
        except AssertionError:
            raise
        except:
            pass

    print("\n--- Chase Meter ---")
    chase_tests = [(60, 3, 5), (80, 5, 7), (120, 8, 6), (30, 2, 1), (45, 4, 3), (150, 9, 8), (-50, 5, 5), (100, 10, 2)]
    for target, wkts, overs in chase_tests:
        try:
            print(duckworth_lewis_check(target, wkts, overs))
        except AssertionError:
            raise
        except:
            pass

    print("\n--- Player of the Match ---")
    players = [
        (105, 0, 1),     # Valid
        (30, 5, 0),      # Valid
        (50, 2, 3),      # Valid
        (10, 1, 1),      # Valid
        (75, 3, 2),      # Valid
        (45, 1, 0),      # Valid
        (-50, 2, 1),     # INVALID: negative runs
        (80, -1, 2),     # INVALID: negative wickets
    ]
    for b, w, c in players:
        try:
            print(f"Runs:{b} Wickets:{w} Catches:{c} -> {player_of_match(b, w, c)}")
        except AssertionError:
            raise
        except:
            pass


if __name__ == "__main__":
    main()
