import type {
  ReadingDensity,
  ReadingFontScale,
  ReadingPreferences,
  ReadingTheme,
  ReadingWidth,
} from "../../hooks/useReadingPreferences";

type ReadingControlsProps = {
  preferences: ReadingPreferences;
  onChange: (next: Partial<ReadingPreferences>) => void;
  onReset: () => void;
};

const widthOptions: Array<{ value: ReadingWidth; label: string }> = [
  { value: "narrow", label: "Narrow" },
  { value: "comfortable", label: "Comfortable" },
  { value: "wide", label: "Wide" },
];

const fontOptions: Array<{ value: ReadingFontScale; label: string }> = [
  { value: "small", label: "Small" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
];

const densityOptions: Array<{ value: ReadingDensity; label: string }> = [
  { value: "calm", label: "Calm" },
  { value: "compact", label: "Compact" },
];

const themeOptions: Array<{ value: ReadingTheme; label: string }> = [
  { value: "ember", label: "Ember" },
  { value: "graphite", label: "Graphite" },
  { value: "parchment-dark", label: "Parchment dark" },
];

export function ReadingControls({
  preferences,
  onChange,
  onReset,
}: ReadingControlsProps) {
  return (
    <section className="reading-controls" aria-labelledby="reading-controls-title">
      <div className="reading-controls__heading">
        <h2 id="reading-controls-title">Reading controls</h2>
        <button className="text-button" type="button" onClick={onReset}>
          Reset
        </button>
      </div>

      <ControlGroup
        label="Width"
        options={widthOptions}
        value={preferences.width}
        onChange={(width) => onChange({ width })}
      />
      <ControlGroup
        label="Font"
        options={fontOptions}
        value={preferences.fontScale}
        onChange={(fontScale) => onChange({ fontScale })}
      />
      <ControlGroup
        label="Density"
        options={densityOptions}
        value={preferences.density}
        onChange={(density) => onChange({ density })}
      />
      <ControlGroup
        label="Theme"
        options={themeOptions}
        value={preferences.theme}
        onChange={(theme) => onChange({ theme })}
      />
    </section>
  );
}

function ControlGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="segmented-control">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <button
            key={option.value}
            aria-pressed={option.value === value}
            className={
              option.value === value
                ? "segmented-control__button is-active"
                : "segmented-control__button"
            }
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
