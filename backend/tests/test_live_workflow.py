import requests

def test_live_lifecycle():
    # 1. Login
    login_res = requests.post('http://127.0.0.1:8000/api/auth/login', json={'email': 'admin@techcorp.com', 'password': 'Admin@2026Secure!'})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    print("1. Authenticated as Admin.")

    # 2. Preview Excel
    with open('sample_interns_tasks.xlsx', 'rb') as f:
        prev_res = requests.post(
            'http://127.0.0.1:8000/api/imports/preview',
            headers=headers,
            files={'file': ('sample_interns_tasks.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        )
    assert prev_res.status_code == 200, f"Preview failed: {prev_res.text}"
    preview_data = prev_res.json()
    print(f"2. Excel preview: {preview_data['total_rows']} total, {preview_data['valid_rows']} valid.")

    # 3. Confirm Import
    confirm_res = requests.post(
        'http://127.0.0.1:8000/api/imports/confirm',
        headers=headers,
        json={
            'batch_id': preview_data['batch_id'],
            'column_mappings': preview_data['suggested_mappings']
        }
    )
    assert confirm_res.status_code == 200, f"Confirm failed: {confirm_res.text}"
    print(f"3. Ingestion confirmed: {confirm_res.json()['message']}")

    # 4. Verify updated dashboard metrics
    stats_res = requests.get('http://127.0.0.1:8000/api/dashboard/admin-stats', headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    print(f"4. Updated live database stats: total_interns={stats['total_interns']}, pending_submissions={stats['pending_submissions']}")
    print("LIVE END-TO-END WORKFLOW VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    test_live_lifecycle()
