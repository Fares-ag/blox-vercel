import React, { useState, useEffect } from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { Select, Input, Button } from '@shared/components';
import type { SelectOption } from '@shared/components';
import { vehicleService, type VehicleFilters } from '../../../../services/vehicle.service';
import './VehicleFilter.scss';

interface VehicleFilterProps {
  filters: VehicleFilters;
  onChange: (filters: Partial<VehicleFilters>) => void;
}

export const VehicleFilter: React.FC<VehicleFilterProps> = ({ filters, onChange }) => {
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [localFilters, setLocalFilters] = useState<VehicleFilters>(filters);

  // Available makes (could come from API)
  const availableMakes = ['Toyota', 'Honda', 'Nissan', 'BMW', 'Mercedes-Benz', 'Audi', 'Lexus'];

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    // Load makes
    setMakes(availableMakes);
  }, []);

  useEffect(() => {
    // Load models when make changes
    if (localFilters.make) {
      // In real app, fetch from API
      const modelsByMake: Record<string, string[]> = {
        Toyota: ['Camry', 'Corolla', 'RAV4', 'Highlander'],
        Honda: ['Accord', 'Civic', 'CR-V', 'Pilot'],
        Nissan: ['Altima', 'Sentra', 'Rogue', 'Pathfinder'],
        BMW: ['3 Series', '5 Series', 'X3', 'X5'],
        'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE'],
        Audi: ['A4', 'A6', 'Q5', 'Q7'],
        Lexus: ['ES', 'RX', 'NX', 'GX'],
      };
      setModels(modelsByMake[localFilters.make] || []);
    } else {
      setModels([]);
    }
  }, [localFilters.make]);

  const handleFilterChange = (key: keyof VehicleFilters, value: any, applyImmediately = false) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    if (applyImmediately) {
      onChange(newFilters);
    }
  };

  const handleApplyFilters = () => {
    onChange(localFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: VehicleFilters = {
      page: 1,
      limit: filters.limit || 12,
    };
    setLocalFilters(clearedFilters);
    onChange(clearedFilters);
  };

  const makeOptions: SelectOption[] = makes.map((make) => ({ value: make, label: make }));
  const modelOptions: SelectOption[] = models.map((model) => ({ value: model, label: model }));

  const conditionOptions: SelectOption[] = [
    { value: 'new', label: 'New' },
    { value: 'old', label: 'Used' },
  ];

  return (
    <Box className="vehicle-filter">
      <Typography variant="h6" className="filter-title">
        Filters
      </Typography>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle2">Make & Model</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box className="filter-group">
            <Select
              label="Make"
              value={localFilters.make || ''}
              options={makeOptions}
              onChange={(e) => {
                const value = e.target.value ? String(e.target.value) : undefined;
                const newFilters = { ...localFilters, make: value, model: undefined };
                setLocalFilters(newFilters);
                // Apply immediately so the vehicle list updates right away
                onChange(newFilters);
              }}
              placeholder="All Makes"
            />
            <Select
              label="Model"
              value={localFilters.model || ''}
              options={modelOptions}
              onChange={(e) => {
                const value = e.target.value ? String(e.target.value) : undefined;
                handleFilterChange('model', value, true);
              }}
              placeholder="All Models"
              disabled={!localFilters.make}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle2">Price Range</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box className="filter-group">
            <Input
              type="number"
              label="Min Price"
              value={localFilters.minPrice?.toString() || ''}
              onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0"
            />
            <Input
              type="number"
              label="Max Price"
              value={localFilters.maxPrice?.toString() || ''}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="500000"
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle2">Year Range</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box className="filter-group">
            <Input
              type="number"
              label="Min Year"
              value={localFilters.minYear?.toString() || ''}
              onChange={(e) => handleFilterChange('minYear', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="2018"
            />
            <Input
              type="number"
              label="Max Year"
              value={localFilters.maxYear?.toString() || ''}
              onChange={(e) => handleFilterChange('maxYear', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="2024"
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle2">Condition</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box className="filter-group">
            <Select
              label="Condition"
              value={localFilters.condition || ''}
              options={conditionOptions}
              onChange={(e) => {
                const value = e.target.value ? (String(e.target.value) as 'new' | 'old') : undefined;
                handleFilterChange('condition', value, true);
              }}
              placeholder="All Conditions"
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      <Box className="filter-actions">
        <Button variant="primary" onClick={handleApplyFilters} fullWidth>
          Apply Filters
        </Button>
        <Button variant="secondary" onClick={handleClearFilters} fullWidth>
          Clear All
        </Button>
      </Box>
    </Box>
  );
};

