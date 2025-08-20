import { Button } from '../ui/button';
import type { Instrument } from '@gilton/shared';

interface InstrumentSelectorProps {
  instruments: Instrument[];
  selectedInstrumentId?: string;
  onSelect: (instrumentId: string) => void;
}

export const InstrumentSelector = ({ 
  instruments, 
  selectedInstrumentId, 
  onSelect 
}: InstrumentSelectorProps) => {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">악기 선택</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {instruments
          .filter(instrument => instrument.isActive)
          .sort((a, b) => a.order - b.order)
          .map((instrument) => (
            <Button
              key={instrument.id}
              variant={selectedInstrumentId === instrument.id ? 'default' : 'outline'}
              className="h-20 flex-col space-y-2 text-base"
              onClick={() => onSelect(instrument.id)}
            >
              <span className="text-2xl">{instrument.icon}</span>
              <span className="text-sm">{instrument.name}</span>
            </Button>
          ))}
      </div>
    </div>
  );
};