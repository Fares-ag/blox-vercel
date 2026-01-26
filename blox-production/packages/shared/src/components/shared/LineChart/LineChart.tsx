import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Box, Typography } from '@mui/material';
import './LineChart.scss';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface LineChartDataPoint {
  label: string;
  value: number;
}

export interface LineChartDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string;
  fill?: boolean;
  tension?: number;
}

interface LineChartProps {
  title?: string;
  labels: string[];
  datasets: LineChartDataset[];
  height?: number;
  showLegend?: boolean;
  yAxisLabel?: string;
}

export const LineChart: React.FC<LineChartProps> = React.memo(({
  title,
  labels,
  datasets,
  height = 300,
  showLegend = true,
  yAxisLabel,
}) => {
  const chartData = {
    labels,
    datasets: datasets.map((dataset) => ({
      ...dataset,
      borderColor: dataset.borderColor || '#00CFA2',
      backgroundColor: dataset.backgroundColor || 'rgba(0, 207, 162, 0.1)',
      fill: dataset.fill !== undefined ? dataset.fill : true,
      tension: dataset.tension !== undefined ? dataset.tension : 0.4,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
      },
      title: {
        display: !!title,
        text: title,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel,
        },
        ticks: {
          callback: function (value: any) {
            return typeof value === 'number' ? value.toLocaleString() : value;
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <Box className="line-chart-container" sx={{ height: `${height}px` }}>
      {title && (
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          {title}
        </Typography>
      )}
      <Line data={chartData} options={options} />
    </Box>
  );
});

