import React, { useEffect, useState } from 'react';
import { DealCard } from '../components/DealCard';
import { fetchDeals } from '../api';

export function Deals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeals()
      .then(setDeals)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} />
  
    
    
    
        