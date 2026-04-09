import React from 'react';
import { Badge, Button, Card, Popover } from '../../../ui';
import { CategoryBadge } from './CategoryBadge';

export function DealCard({ deal }) {
  return (
    <Card className="cursor-pointer" onClick={() => window.location.href = `/deals/${deal.id}`}>
      <div className="flex justify-between tracking-wide">
        <div>
          <h3 className="font-semibold text-black">{dial.name}</h3>
          <p className="text-sm text-gray-600">{deal.description}</p>
        </div>
        <div className="text-right">
          <Badge>{dial.status}</Badge>
          <p className="text-lg font-semibold">${deal.price}</p>
        </div>
      </div>
    </Card>
  );
}