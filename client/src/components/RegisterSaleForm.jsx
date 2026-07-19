import CustomSelect from './CustomSelect';

export default function RegisterSaleForm({
  users,
  newSale,
  setNewSale,
  handleCreateSale,
}) {
  return (
    <div className="card">
      <div className="card-title">Register Affiliate Sale</div>
      <form onSubmit={handleCreateSale}>
        <div className="form-group">
          <label className="form-label">Affiliate User</label>
          <CustomSelect
            value={newSale.userId}
            onChange={(val) => setNewSale({ ...newSale, userId: val })}
            options={users.map((u) => ({ value: u._id, label: u.name }))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Brand</label>
          <CustomSelect
            value={newSale.brand}
            onChange={(val) => setNewSale({ ...newSale, brand: val })}
            options={[
              { value: 'brand_1', label: 'Brand 1' },
              { value: 'brand_2', label: 'Brand 2' },
              { value: 'brand_3', label: 'Brand 3' }
            ]}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Earning Amount (₹)</label>
          <input
            type="number"
            step="0.01"
            className="form-control"
            placeholder="e.g. 150.00"
            value={newSale.earning}
            onChange={(e) => setNewSale({ ...newSale, earning: e.target.value })}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          Create Sale Record
        </button>
      </form>
    </div>
  );
}
