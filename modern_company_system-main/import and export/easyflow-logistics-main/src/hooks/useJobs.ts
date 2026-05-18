
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobService } from '@/services/jobService';

export const useJobs = () => {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: jobService.getJobs,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: jobService.createJob,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['jobs'],
      });
    },
  });
};