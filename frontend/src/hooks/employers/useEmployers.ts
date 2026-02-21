import { useState, useEffect } from 'react';
import { getEmployers, getEmployerById } from '../../services/api/employers.service';

export interface EmployersListOptions {
  skip?: boolean;
}

export interface EmployersListHook {
  data: any;
  loading: boolean;
  error: any;
  refetch: () => void;
}

/**
 * Custom hook to fetch all employers list
 * @returns {Object} { data, loading, error, refetch }
 */
export const useEmployersList = (options: EmployersListOptions = {}): EmployersListHook => {
  const [data, setData] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(!options.skip);
  const [error, setError] = useState<any>(null);

  const fetchEmployers = async () => {
    if (options.skip) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getEmployers();
      setData(result || []);
    } catch (err) {
      console.error('Failed to fetch employers:', err);
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.skip]);

  const refetch = () => {
    fetchEmployers();
  };

  return { data, loading, error, refetch };
};

export interface EmployerDetailsHook {
  data: any;
  loading: boolean;
  error: any;
  refetch: () => void;
}

/**
 * Custom hook to fetch single employer by ID
 * @param {number} id - Employer ID
 * @returns {Object} { data, loading, error, refetch }
 */
export const useEmployerDetails = (id: number | string | null): EmployerDetailsHook => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  const fetchEmployer = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getEmployerById(id);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch employer:', err);
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const refetch = () => {
    fetchEmployer();
  };

  return { data, loading, error, refetch };
};
