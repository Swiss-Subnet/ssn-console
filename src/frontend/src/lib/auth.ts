import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

export const useRequireAuth = (): void => {
  const { isLoginSuccess } = useInternetIdentity();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoginSuccess && location.pathname !== '/') {
      navigate('/');
    }
  }, [isLoginSuccess, navigate, location.pathname]);
};
