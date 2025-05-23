'use client';
import { useEffect, useState } from 'react';

interface Loan {
  product_id: number;
  product_name: string;
  product_type: string;
  balance: number;
  credit_limit: number;
  start_date: string;
  end_date: string;
  status: string;
  payment_amount: number;
  payment_frequency: string;
  interest_rate: number;
  annual_fee: number;
}

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const backendApiUrl = "http://34.9.145.33:8000";
  useEffect(() => {
    const storedEmail = localStorage.getItem('email');
    setEmail(storedEmail);
  }, []);

  useEffect(() => {
    if (email) {
      setLoading(true);
      fetch(`${backendApiUrl}/user/loans/${email}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data.loans)) {
            setLoans(data.loans);
          } else {
            console.warn("Loans data is not an array:", data);
            setLoans([]);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Failed to fetch loans:", error);
          setLoans([]);
          setLoading(false);
        });
    } else if (email === null && typeof window !== 'undefined') {
        // Still waiting for email from localStorage or it's not set
        setLoading(false); // Stop loading if no email after initial check
    }
  }, [email]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gray-800 shadow-xl rounded-lg p-6">
          <h1 className="text-3xl font-bold mb-8 text-gray-100 text-center">My Loans</h1>

          {loading ? (
            <div className="text-center py-10 text-gray-300">Loading loans...</div>
          ) : loans.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              You currently have no active loans.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-750">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Product Name</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Balance</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Interest Rate</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Start Date</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">End Date</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {loans.map((loan) => (
                    <tr key={loan.product_id} className="hover:bg-gray-750 transition-colors duration-150">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-100">{loan.product_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                        ${loan.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                        {loan.interest_rate !== null && loan.interest_rate !== undefined ? `${loan.interest_rate.toFixed(2)}%` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{formatDate(loan.start_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{formatDate(loan.end_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          loan.status?.toLowerCase() === 'active' ? 'bg-green-700 text-green-100' :
                          loan.status?.toLowerCase() === 'paid off' ? 'bg-blue-700 text-blue-100' :
                          loan.status?.toLowerCase() === 'defaulted' ? 'bg-red-700 text-red-100' :
                          loan.status?.toLowerCase() === 'pending' ? 'bg-yellow-700 text-yellow-100' :
                          'bg-gray-600 text-gray-100'
                        }`}>
                          {loan.status || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}