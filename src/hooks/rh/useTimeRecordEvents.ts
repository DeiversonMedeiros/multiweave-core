import { useQuery } from '@tanstack/react-query';
import { TimeRecordsService } from '@/services/rh/timeRecordsService';
import { TimeRecordEvent } from '@/integrations/supabase/rh-types';

export function useTimeRecordEvents(timeRecordId?: string) {
  return useQuery<{ events: TimeRecordEvent[] }, Error>({
    queryKey: ['rh', 'time-record-events', timeRecordId],
    queryFn: async () => {
      if (!timeRecordId) return { events: [] };
      const rows = await TimeRecordsService.listEvents({ timeRecordId });
      return { events: rows as TimeRecordEvent[] };
    },
    enabled: !!timeRecordId,
    staleTime: 60 * 1000,
  });
}


