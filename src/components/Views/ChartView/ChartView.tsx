import {
  chartZoomAtom,
  currentBeatAtom,
  followMeasureAtom,
  selectedPartIdAtom,
  selectedSongAtom,
} from '@/stores/store.ts';
import { useAtom, useAtomValue } from 'jotai';
import { calculateMeasure } from '@/utils/calc-current-measure.ts';
import { useBakedChart, useChartPart } from '@/hooks/useBakedChart.ts';
import { SheetViewer } from '@/components/Views/ChartView/SheetViewer.tsx';
import { FULL_SCORE_PART_ID, type BakedPart } from '@/interfaces/baked-chart.ts';
import { useMemo } from 'react';

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <p className="text-gray-500">{children}</p>
    </div>
  );
}

function PartSelector({
  parts,
  value,
  onChange,
}: {
  parts: BakedPart[];
  value: number;
  onChange: (id: number) => void;
}) {
  // A single-instrument chart has just the full score — no point showing a picker.
  if (parts.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-3 py-1.5 mt-8">
      <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">Part</label>
      <select
        className="rounded-sm border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-700"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {parts.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export const ChartView = () => {
  const beat = useAtomValue(currentBeatAtom);
  const song = useAtomValue(selectedSongAtom);
  const [partId, setPartId] = useAtom(selectedPartIdAtom);
  const zoom = useAtomValue(chartZoomAtom);
  const follow = useAtomValue(followMeasureAtom);

  const chartState = useBakedChart(song);
  const chart = chartState.status === 'ready' ? chartState.chart : undefined;

  // Persisted part may not exist in this chart — fall back to the full score.
  const effectivePartId = useMemo(() => {
    if (!chart) return partId;
    return chart.manifest.parts.some((p) => p.id === partId)
      ? partId
      : chart.manifest.parts[0]?.id ?? FULL_SCORE_PART_ID;
  }, [chart, partId]);

  const partData = useChartPart(chart, effectivePartId);

  if (!song) return null;
  if (chartState.status === 'loading') return <Centered>Preparing chart…</Centered>;
  if (chartState.status === 'missing') return <Centered>Chart not found!</Centered>;
  if (chartState.status === 'error') return <Centered>Failed to load chart: {chartState.error}</Centered>;
  if (!chart) return <Centered>Preparing chart…</Centered>;

  return (
    <div className="w-full h-full min-w-0 min-h-0 bg-white flex flex-col overflow-hidden">
      <PartSelector parts={chart.manifest.parts} value={effectivePartId} onChange={setPartId} />
      {/* relative + min-0 so the sheet's scroll box is sized by this slot, never
          by the sheet's own (potentially huge) content. */}
      <div className="relative flex-1 min-h-0 min-w-0">
        {partData ? (
          <SheetViewer
            pages={partData.pages}
            positions={partData.positions}
            activeMeasure={Math.floor(calculateMeasure(beat, song))}
            zoom={zoom}
            follow={follow}
          />
        ) : (
          <Centered>Preparing chart…</Centered>
        )}
      </div>
    </div>
  );
};
