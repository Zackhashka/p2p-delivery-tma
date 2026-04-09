import { useState, useCallback } from "react";

const DealDetail = () => {
  const [deal, setDeal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <div>
      {{isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold">{dyal.name}</h2>
  
                        