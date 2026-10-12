import { Icon } from './Icon';

/** Confirmação discreta: aparece, confirma e some sozinha. */
export function Toast({ text }: { text: string }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <Icon name="check" size={16} />{text}
    </div>
  );
}
