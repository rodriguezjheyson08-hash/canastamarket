import React from 'react';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import Tooltip from '@mui/material/Tooltip';
import { useNavigate } from 'react-router-dom';

const BackButton: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Tooltip title="Regresar">
      <IconButton
        size="small"
        onClick={() => navigate(-1)}
        sx={{ p: 0.5, ml: 0.5 }}
        color="primary"
      >
        <ArrowBackIosNewIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export default BackButton; 