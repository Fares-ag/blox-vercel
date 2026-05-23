import React, { useState } from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import { ExpandMore, Clear } from '@mui/icons-material';
import { Button } from '../../core/Button/Button';
import { Input } from '../../core/Input/Input';
import { Select, type SelectOption } from '../../core/Select/Select';
import { DatePicker } from '../../core/DatePicker/DatePicker';
  import { Slider } from '@mui/material';
  import moment from 'moment';
  type Moment = moment.Moment;
import './FilterPanel.scss';

export interface FilterConfig {
  id: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'range' | 'checkbox';
  options?: SelectOption[];
  min?: number;
  max?: number;
  step?: number;
}

interface FilterPanelProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onClear?: () => void;
  title?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  values,
  onChange,
  onClear,
  title = 'Filters',
}) => {
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleFilterChange = (filterId: string, value: any) => {
    onChange({ ...values, [filterId]: value });
  };

  const handleClearFilter = (filterId: string) => {
    const newValues = { ...values };
    delete newValues[filterId];
    onChange(newValues);
  };

  const getActiveFiltersCount = () => {
    return Object.keys(values).filter((key) => {
      const value = values[key];
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }).length;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Box className="filter-panel">
      <Accordion expanded={expanded === 'filters'} onChange={(_, isExpanded) => setExpanded(isExpanded ? 'filters' : false)}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h4">
            {title} {activeFiltersCount > 0 && <Chip label={activeFiltersCount} size="small" />}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box className="filter-content">
            {filters.map((filter) => {
              const filterValue = values[filter.id];

              return (
                <Box key={filter.id} className="filter-item">
                  <Box className="filter-header">
                    <Typography variant="body2" className="filter-label">
                      {filter.label}
                    </Typography>
                    {filterValue && (
                      <Chip
                        icon={<Clear />}
                        label="Clear"
                        size="small"
                        onClick={() => handleClearFilter(filter.id)}
                        className="clear-chip"
                      />
                    )}
                  </Box>

                  {filter.type === 'text' && (
                    <Input
                      value={filterValue || ''}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      placeholder={`Enter ${filter.label.toLowerCase()}`}
                    />
                  )}

                  {filter.type === 'select' && filter.options && (
                    <Select
                      value={filterValue || ''}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      options={filter.options}
                      label={filter.label}
                    />
                  )}

                  {filter.type === 'multiselect' && filter.options && (
                    <Select
                      multiple
                      value={Array.isArray(filterValue) ? filterValue : []}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      options={filter.options}
                      label={filter.label}
                    />
                  )}

                  {filter.type === 'date' && (
                    <DatePicker
                      value={filterValue ? moment(filterValue) : null}
                      onChange={(value: Moment | null) =>
                        handleFilterChange(filter.id, value ? value.format('YYYY-MM-DD') : null)
                      }
                      label={filter.label}
                    />
                  )}

                  {filter.type === 'daterange' && (
                    <Box className="date-range">
                      <DatePicker
                        value={filterValue?.startDate ? moment(filterValue.startDate) : null}
                        onChange={(value: Moment | null) =>
                          handleFilterChange(filter.id, {
                            ...filterValue,
                            startDate: value ? value.format('YYYY-MM-DD') : null,
                          })
                        }
                        label="Start Date"
                      />
                      <DatePicker
                        value={filterValue?.endDate ? moment(filterValue.endDate) : null}
                        onChange={(value: Moment | null) =>
                          handleFilterChange(filter.id, {
                            ...filterValue,
                            endDate: value ? value.format('YYYY-MM-DD') : null,
                          })
                        }
                        label="End Date"
                      />
                    </Box>
                  )}

                  {filter.type === 'range' && (
                    <Box className="range-slider">
                      <Slider
                        value={filterValue || [filter.min || 0, filter.max || 100]}
                        onChange={(_, newValue) => handleFilterChange(filter.id, newValue)}
                        min={filter.min || 0}
                        max={filter.max || 100}
                        step={filter.step || 1}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  )}
                </Box>
              );
            })}

            {activeFiltersCount > 0 && onClear && (
              <Box className="filter-actions">
                <Button variant="secondary" onClick={onClear}>
                  Clear All Filters
                </Button>
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
