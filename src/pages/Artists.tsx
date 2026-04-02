import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Artists() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/events', { replace: true });
  }, [navigate]);
  return null;
}
