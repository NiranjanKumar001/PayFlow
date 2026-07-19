import { useState, useEffect } from 'react';
import { api } from './services/api';
import './App.css';

// Components
import Toast from './components/Toast';
import Header from './components/Header';
import StatsCards from './components/StatsCards';
import SalesTable from './components/SalesTable';
import UsersTable from './components/UsersTable';
import PayoutsTable from './components/PayoutsTable';
import RegisterSaleForm from './components/RegisterSaleForm';
import WithdrawForm from './components/WithdrawForm';

function App() {
  const [users, setUsers] = useState([]);
  const [sales, setSales] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [activeTab, setActiveTab] = useState('sales');

  // Filters
  const [salesFilter, setSalesFilter] = useState({ userId: '', status: '' });
  const [payoutsFilter, setPayoutsFilter] = useState({ userId: '' });

  // Forms
  const [newSale, setNewSale] = useState({ userId: 'john_doe', brand: 'brand_1', earning: '' });
  const [newWithdrawal, setNewWithdrawal] = useState({ userId: 'john_doe', amount: '' });

  // Selections for Bulk Actions
  const [selectedSales, setSelectedSales] = useState([]);

  // Notifications
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fetchedUsers, fetchedSales, fetchedPayouts] = await Promise.all([
        api.getUsers(),
        api.getSales(salesFilter),
        api.getPayouts(payoutsFilter.userId),
      ]);
      setUsers(fetchedUsers);
      setSales(fetchedSales);
      setPayouts(fetchedPayouts);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [salesFilter, payoutsFilter]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleCreateSale = async (e) => {
    e.preventDefault();
    if (!newSale.earning || parseFloat(newSale.earning) <= 0) {
      showToast('Earning must be a positive number', 'error');
      return;
    }
    try {
      await api.createSale({
        userId: newSale.userId,
        brand: newSale.brand,
        earning: parseFloat(newSale.earning),
      });
      showToast('Sale created successfully');
      setNewSale({ ...newSale, earning: '' });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleWithdrawal = async (e) => {
    e.preventDefault();
    if (!newWithdrawal.amount || parseFloat(newWithdrawal.amount) <= 0) {
      showToast('Withdrawal amount must be a positive number', 'error');
      return;
    }
    try {
      await api.withdraw(newWithdrawal.userId, parseFloat(newWithdrawal.amount));
      showToast('Withdrawal initiated successfully');
      setNewWithdrawal({ ...newWithdrawal, amount: '' });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRunAdvancePayoutJob = async () => {
    try {
      const res = await api.runAdvancePayoutJob();
      if (res.processed > 0) {
        showToast(`Job ran: processed ${res.processed} sales. Paid: ₹${res.totalAdvance} advance.`);
      } else {
        showToast('Job ran: no eligible pending sales found.', 'success');
      }
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReconcileSale = async (saleId, status) => {
    try {
      await api.reconcileSale(saleId, status);
      showToast(`Sale reconciled as ${status}`);
      setSelectedSales((prev) => prev.filter((id) => id !== saleId));
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkReconcile = async (status) => {
    if (selectedSales.length === 0) return;
    try {
      await api.reconcileBulk(selectedSales, status);
      showToast(`Reconciled ${selectedSales.length} sales as ${status}`);
      setSelectedSales([]);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handlePayoutStatusUpdate = async (payoutId, status) => {
    try {
      await api.updatePayoutStatus(payoutId, status);
      showToast(`Payout status updated to ${status}. Recovered successfully!`);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Toggle selection for bulk reconcile
  const handleSelectSale = (saleId) => {
    setSelectedSales((prev) =>
      prev.includes(saleId) ? prev.filter((id) => id !== saleId) : [...prev, saleId]
    );
  };

  const handleSelectAllSales = () => {
    const pendingSales = sales.filter((s) => s.status === 'pending');
    if (selectedSales.length === pendingSales.length) {
      setSelectedSales([]);
    } else {
      setSelectedSales(pendingSales.map((s) => s._id));
    }
  };

  return (
    <>
      <Toast toast={toast} />

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleRunAdvancePayoutJob={handleRunAdvancePayoutJob}
      />

      <StatsCards users={users} sales={sales} isLoading={isLoading} />

      <div className="dashboard-grid">
        <div className="main-content-column">
          {activeTab === 'sales' && (
            <SalesTable
              sales={sales}
              users={users}
              salesFilter={salesFilter}
              setSalesFilter={setSalesFilter}
              selectedSales={selectedSales}
              handleSelectAllSales={handleSelectAllSales}
              handleSelectSale={handleSelectSale}
              handleBulkReconcile={handleBulkReconcile}
              handleReconcileSale={handleReconcileSale}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'users' && <UsersTable users={users} isLoading={isLoading} />}

          {activeTab === 'payouts' && (
            <PayoutsTable
              payouts={payouts}
              users={users}
              payoutsFilter={payoutsFilter}
              setPayoutsFilter={setPayoutsFilter}
              handlePayoutStatusUpdate={handlePayoutStatusUpdate}
              isLoading={isLoading}
            />
          )}
        </div>

        <div className="sidebar-column">
          <RegisterSaleForm
            users={users}
            newSale={newSale}
            setNewSale={setNewSale}
            handleCreateSale={handleCreateSale}
          />

          <WithdrawForm
            users={users}
            newWithdrawal={newWithdrawal}
            setNewWithdrawal={setNewWithdrawal}
            handleWithdrawal={handleWithdrawal}
          />
        </div>
      </div>
    </>
  );
}

export default App;
