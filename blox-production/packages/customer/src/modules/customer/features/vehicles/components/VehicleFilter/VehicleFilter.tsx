import React, { useState, useEffect } from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { Select, Input, Button } from '@shared/components';
import type { SelectOption } from '@shared/components';
import {
  vehicleService,
  type VehicleFilters,
} from '../../../../services/vehicle.service';
import './VehicleFilter.scss';

interface VehicleFilterProps {
  filters: VehicleFilters;
  onChange: (filters: Partial<VehicleFilters>) => void;
}

export const VehicleFilter: React.FC<VehicleFilterProps> = ({ filters, onChange }) => {
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [localFilters, setLocalFilters] = useState<VehicleFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    void vehicleService.getMakes().then((res) => {
      if (res.status === 'SUCCESS' && res.data) {
        setMakes(res.data);
      }
    });
  }, []);

  useEffect(() => {
    if (!localFilters.make) {
      setModels([]);
      return;
    }
    let cancelled = false;
    void vehicleService.getModelsByMake(localFilters.make).then((res) => {
      if (cancelled) return;
      if (res.status === 'SUCCESS' && res.data) {
        setModels(res.data);
      } else {
        setModels([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [localFilters.make]);

  const handleFilterChange = (key: keyof VehicleFilters, value: unknown, applyImmediately = false) => {
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
              onChange={(e) => {
                const raw = e.target.value ? Number(e.target.value) : undefined;
                handleFilterChange('maxPrice', raw);
              }}
              placeholder="Any"
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
