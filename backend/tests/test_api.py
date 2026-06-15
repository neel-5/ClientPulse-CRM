def auth_headers(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "param5saxena@gmail.com", "password": "Demo@123"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_health_and_login(client):
    assert client.get("/health").json()["status"] == "healthy"
    headers = auth_headers(client)
    assert client.get("/api/auth/me", headers=headers).json()["role"] == "admin"


def test_complete_crm_workflow(client):
    headers = auth_headers(client)
    created = client.post(
        "/api/leads",
        headers=headers,
        json={
            "name": "Test Pilot",
            "business_name": "Pilot Services",
            "phone": "+919999000001",
            "email": "pilot@example.com",
            "source": "Website",
            "value": 50000,
        },
    )
    assert created.status_code == 201
    lead_id = created.json()["id"]

    moved = client.post(
        f"/api/leads/{lead_id}/move",
        headers=headers,
        json={"stage": "Interested"},
    )
    assert moved.json()["stage"] == "Interested"

    message = client.post(
        "/api/whatsapp/mock-message",
        headers=headers,
        json={
            "phone": "+919999000001",
            "name": "Test Pilot",
            "message": "Can I see a demo tomorrow?",
        },
    )
    assert message.status_code == 201

    ai_reply = client.post(
        "/api/ai/reply",
        headers=headers,
        json={"lead_id": lead_id, "context": "demo request"},
    )
    assert "draft" in ai_reply.json()

    followup = client.post(
        "/api/followups",
        headers=headers,
        json={
            "lead_id": lead_id,
            "due_at": "2030-06-15T10:00:00Z",
            "type": "demo",
            "note": "Run pilot demo",
        },
    )
    assert followup.status_code == 201
    completed = client.post(
        f"/api/followups/{followup.json()['id']}/complete",
        headers=headers,
    )
    assert completed.json()["status"] == "completed"

    dashboard = client.get("/api/dashboard", headers=headers)
    assert dashboard.status_code == 200
    assert dashboard.json()["metrics"]["total_leads"] >= 13


def test_csv_sheet_sync(client):
    headers = auth_headers(client)
    response = client.post("/api/sheets/sync", headers=headers, json={})
    assert response.status_code == 200
    assert response.json()["mode"] == "csv"
