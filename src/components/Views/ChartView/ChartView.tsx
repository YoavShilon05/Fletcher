import { selectedPartIdAtom, selectedSongAtom } from '@/stores/store.ts';
import { useAtom, useAtomValue } from 'jotai';
import { useChartPart } from '@/hooks/useBakedChart.ts';
import { SheetViewer } from '@/components/Views/ChartView/SheetViewer.tsx';
import { Centered, ScoreSurface, useScoreView } from '@/components/Views/ScoreView.tsx';
import { FULL_SCORE_PART_ID, type BakedPart } from '@/interfaces/baked-chart.ts';
import { useMemo } from 'react';

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
    <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-3 py-1.5">
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
  const song = useAtomValue(selectedSongAtom);
  const [partId, setPartId] = useAtom(selectedPartIdAtom);

  const state = useScoreView(song);
  const chart = state.ready ? state.chart : undefined;

  // Persisted part may not exist in this chart — fall back to the full score.
  const effectivePartId = useMemo(() => {
    if (!chart) return partId;
    return chart.manifest.parts.some((p) => p.id === partId)
      ? partId
      : chart.manifest.parts[0]?.id ?? FULL_SCORE_PART_ID;
  }, [chart, partId]);

  const partData = useChartPart(chart, effectivePartId);

  if (!state.ready) return state.placeholder;

  return (
    <ScoreSurface
      header={
        <PartSelector
          parts={state.chart.manifest.parts}
          value={effectivePartId}
          onChange={setPartId}
        />
      }
    >
      {partData ? (
        <SheetViewer
          pages={partData.pages}
          positions={partData.positions}
          activeMeasure={state.activeMeasure}
          zoom={state.zoom}
          follow={state.follow}
        />
      ) : (
        <Centered>Preparing chart…</Centered>
      )}
    </ScoreSurface>
  );
};
