import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export const useRequireAuth = (): void => {
  const { isLoginSuccess } = useInternetIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoginSuccess) {
      navigate('/');
    }
  }, [isLoginSuccess, navigate]);
};
