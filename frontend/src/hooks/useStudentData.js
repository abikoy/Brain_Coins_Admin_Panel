import { useState, useEffect } from 'react';

export const useStudentData = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Mock data fetching
    const fetchStudents = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockStudents = [
          { id: 1, name: 'John Doe', email: 'john@example.com', progress: 75, status: 'Active', score: 850 },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com', progress: 92, status: 'Active', score: 920 },
          { id: 3, name: 'Mike Johnson', email: 'mike@example.com', progress: 45, status: 'Active', score: 650 },
        ];
        
        setStudents(mockStudents);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  return { students, loading, error, setStudents };
};

export default useStudentData;
