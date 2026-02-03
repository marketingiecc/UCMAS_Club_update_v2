import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminTeacherManagerPage: React.FC = () => {
  return <Navigate to="/admin/info?tab=teachers" replace />;
};

export default AdminTeacherManagerPage;

