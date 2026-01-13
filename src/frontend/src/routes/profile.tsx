import { H1 } from '@/components/typography/h1';
import { useRequireAuth } from '@/lib/auth';
import { useAppStore } from '@/lib/store';
import { type FC } from 'react';

const Profile: FC = () => {
  useRequireAuth();
  const { identity, profile } = useAppStore();

  return (
    <>
      <H1>Profile</H1>

      <div className="mt-20">ID: {profile?.id}</div>
      <div>Principal: {identity?.getPrincipal().toText()}</div>
    </>
  );
};

export default Profile;
