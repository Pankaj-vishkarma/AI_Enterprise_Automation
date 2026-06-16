/** React Query cache helpers for AI Employee detail — run/metrics updates without refetch storms. */

export function buildRunRecord(employeeId, runResult) {
  return {
    id: runResult.run_id,
    employee_id: Number(employeeId),
    task: runResult.task,
    output: runResult.output,
    status: runResult.status,
    tools_used: runResult.tools_used || [],
    execution_time_ms: runResult.execution_time_ms ?? null,
    token_usage: runResult.token_usage || {},
    created_at: new Date().toISOString(),
  };
}

export function patchMetricsFromRun(prevMetrics, runResult) {
  const prev = prevMetrics || {};
  const prevTotal = prev.total_runs ?? 0;
  const newTotal = prevTotal + 1;
  const next = {
    ...prev,
    total_runs: newTotal,
    successful_runs:
      (prev.successful_runs ?? 0) + (runResult.status === 'completed' ? 1 : 0),
    failed_runs: (prev.failed_runs ?? 0) + (runResult.status === 'failed' ? 1 : 0),
    last_run_at: new Date().toISOString(),
  };

  if (runResult.execution_time_ms != null) {
    if (prev.average_execution_time_ms != null && prevTotal > 0) {
      next.average_execution_time_ms = Math.round(
        ((prev.average_execution_time_ms * prevTotal + runResult.execution_time_ms) /
          newTotal) *
          10
      ) / 10;
    } else {
      next.average_execution_time_ms = runResult.execution_time_ms;
    }
  }

  const toolMap = new Map((prev.most_used_tools || []).map((item) => [item.tool, item.count]));
  for (const tool of runResult.tools_used || []) {
    toolMap.set(tool, (toolMap.get(tool) || 0) + 1);
  }
  next.most_used_tools = [...toolMap.entries()]
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return next;
}

export function applyRunToQueryCache(queryClient, employeeId, runResult) {
  const runRecord = buildRunRecord(employeeId, runResult);

  queryClient.setQueryData(['ai-employee-runs', employeeId], (old) => {
    const prevRuns = old?.data ?? [];
    return { ...(old || {}), data: [runRecord, ...prevRuns] };
  });

  queryClient.setQueryData(['ai-employee-metrics', employeeId], (old) => ({
    ...(old || {}),
    data: patchMetricsFromRun(old?.data, runResult),
  }));

  queryClient.setQueryData(['ai-employee', employeeId], (old) => {
    if (!old?.data) return old;
    const emp = old.data;
    const prevRuns = emp.data?.runs ?? [];
    const prevMetrics = emp.data?.metrics ?? {};
    return {
      ...old,
      data: {
        ...emp,
        data: {
          ...emp.data,
          runs: [runRecord, ...prevRuns].slice(0, 20),
          metrics: patchMetricsFromRun(prevMetrics, runResult),
        },
      },
    };
  });
}
