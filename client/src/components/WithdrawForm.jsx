import CustomSelect from './CustomSelect';

export default function WithdrawForm({
  users,
  newWithdrawal,
  setNewWithdrawal,
  handleWithdrawal,
}) {
  return (
    <div className="card">
      <div className="card-title">Withdraw Balance</div>
      <form onSubmit={handleWithdrawal}>
        <div className="form-group">
          <label className="form-label">Affiliate User</label>
          <CustomSelect
            value={newWithdrawal.userId}
            onChange={(val) => setNewWithdrawal({ ...newWithdrawal, userId: val })}
            options={users.map((u) => ({
              value: u._id,
              label: `${u.name} (Bal: ₹${u.withdrawableBalance.toFixed(2)})`
            }))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Withdrawal Amount (₹)</label>
          <input
            type="number"
            step="0.01"
            className="form-control"
            placeholder="e.g. 50.00"
            value={newWithdrawal.amount}
            onChange={(e) => setNewWithdrawal({ ...newWithdrawal, amount: e.target.value })}
            required
          />
        </div>

        <button type="submit" className="btn btn-success" style={{ width: '100%', justifyContent: 'center' }}>
          Initiate Withdrawal
        </button>
      </form>
    </div>
  );
}
