def test_health(api_client) -> None:
    response = api_client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_example_event(api_client) -> None:
    response = api_client.get("/api/v1/events/example")
    assert response.status_code == 200
    assert response.json()["event_id"] == "fixture-event-001"


def test_event_intake_accepts_normalized_event(api_client) -> None:
    response = api_client.post(
        "/api/v1/events",
        json={
            "event_id": "evt-1",
            "timestamp": "2026-01-01T00:00:00Z",
            "source": "test",
            "event_type": "login",
            "severity": 4,
            "message": "login observed",
        },
    )
    assert response.status_code == 202
    assert response.json()["event_id"] == "evt-1"
    assert response.json()["newly_persisted"] is True


def test_event_intake_rejects_invalid_event(api_client) -> None:
    response = api_client.post("/api/v1/events", json={"event_id": "missing-fields"})
    assert response.status_code == 422


def test_event_intake_persists_event(api_client) -> None:
    response = api_client.post(
        "/api/v1/events",
        json={
            "event_id": "persisted-1",
            "timestamp": "2026-01-01T00:00:00Z",
            "source": "test",
            "event_type": "login",
            "severity": 4,
            "message": "persist me",
        },
    )
    assert response.status_code == 202


def test_duplicate_event_returns_deterministic_result(api_client, test_engine) -> None:
    payload = {
        "event_id": "duplicate-1",
        "timestamp": "2026-01-01T00:00:00Z",
        "source": "test",
        "event_type": "login",
        "severity": 4,
        "message": "original",
    }
    first = api_client.post("/api/v1/events", json=payload)
    second = api_client.post("/api/v1/events", json={**payload, "message": "changed"})
    assert first.json()["newly_persisted"] is True
    assert second.json()["newly_persisted"] is False
    assert second.json()["duplicate"] is True

    from sqlmodel import Session

    from backend.app.persistence.repositories import EventRepository

    with Session(test_engine) as session:
        repository = EventRepository(session)
        stored = repository.get_event("duplicate-1")
        audits = repository.list_audit_events("duplicate-1")
    assert stored is not None
    assert stored.message == "original"
    assert len(audits) == 2


def test_event_intake_stores_normalized_event(api_client, test_engine) -> None:
    response = api_client.post(
        "/api/v1/events",
        json={
            "event_id": "stored-1",
            "timestamp": "2026-01-01T00:00:00Z",
            "source": "test",
            "event_type": "login",
            "severity": 4,
            "message": "stored event",
            "metadata": {"provider": "fixture"},
        },
    )
    assert response.status_code == 202

    from sqlmodel import Session

    from backend.app.persistence.repositories import EventRepository

    with Session(test_engine) as session:
        stored = EventRepository(session).get_event("stored-1")
    assert stored is not None
    assert stored.message == "stored event"
    assert stored.metadata_json == '{"provider": "fixture"}'