import {
  QueryClient,
  QueryClientProvider as QueryClientProviderRc,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutes stale time
      gcTime: 1000 * 60 * 15, // 15 minutes cache time
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProviderRc client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProviderRc>
  );
}
