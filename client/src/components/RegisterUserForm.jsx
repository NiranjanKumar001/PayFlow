import { useState } from 'react';

export default function RegisterUserForm({ handleCreateUser }) {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    if (!userId.trim() || !userName.trim()) return;
    
    // Sanitize ID
    const sanitizedId = userId.trim().toLowerCase().replace(/\s+/g, '_');
    handleCreateUser({ id: sanitizedId, name: userName.trim() });
    
    setUserId('');
    setUserName('');
  };

  return (
    <div className="card">
      <div className="card-title">Register New Affiliate</div>
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label className="form-label">Desired User ID</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. alice_wonder"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            pattern="^[a-zA-Z0-9_\-\s]+$"
            title="Only letters, numbers, spaces, underscores, or hyphens are allowed."
          />
          <small style={{ color: 'hsl(var(--text-secondary))', fontSize: '11px', marginTop: '4px', display: 'block' }}>
            Spaces are automatically converted to underscores (_).
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Alice Wonderland"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
          Create Affiliate Profile
        </button>
      </form>
    </div>
  );
}
