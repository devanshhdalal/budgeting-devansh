import Modal from '@/components/ui/Modal';
import { SHORTCUT_GROUPS } from './shortcuts';

const KeyboardShortcutsModal = ({ open, onClose }) => (
  <Modal open={open} onClose={onClose} title="Keyboard shortcuts" wide>
    <div className="shortcuts-help">
      {SHORTCUT_GROUPS.map((group) => (
        <section key={group.id} className="shortcuts-group">
          <h3 className="shortcuts-group-title">{group.title}</h3>
          <ul className="shortcuts-list">
            {group.items.map((item) => (
              <li key={item.id} className="shortcuts-row">
                <span className="shortcuts-label">{item.label}</span>
                <span className="shortcuts-keys">
                  {item.keys.map((key) => (
                    <kbd key={key} className="shortcut-kbd">
                      {key}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="shortcuts-hint">
        On Mac use ⌘; on Windows and Linux use Ctrl. Shortcuts are disabled while typing in a field.
      </p>
    </div>
  </Modal>
);

export default KeyboardShortcutsModal;
