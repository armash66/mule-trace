from __future__ import annotations

from backend.app.detectors.scales import smooth_window_score


def test_relay_decay_is_smooth_across_scale_boundaries():
    settings = {"windows_minutes": [10, 30, 120, 1440], "weights": [0.4, 0.3, 0.2, 0.1]}
    score_29 = smooth_window_score(29, settings)
    score_31 = smooth_window_score(31, settings)
    score_90 = smooth_window_score(90, settings)
    assert score_29 > score_31 > score_90
    assert score_29 - score_31 < 0.03


def test_old_amount_cutoff_is_not_a_binary_detector_gate():
    settings = {"windows_minutes": [10, 30, 120, 1440], "weights": [0.4, 0.3, 0.2, 0.1]}
    below = smooth_window_score(29.9, settings)
    above = smooth_window_score(30.1, settings)
    assert abs(below - above) < 0.01
