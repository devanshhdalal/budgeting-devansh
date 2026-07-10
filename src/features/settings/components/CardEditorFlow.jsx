import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Stepper, { Step } from '@/components/ui/Stepper';
import PageHeader from '@/components/ui/PageHeader';
import SaveIndicator from '@/components/ui/SaveIndicator';
import CardForm from '@/features/settings/components/CardForm';
import CardReview from '@/features/settings/components/CardReview';
import { fadeUp, scaleIn } from '@/motion/presets';

const CardEditorFlow = ({
  card,
  isAddingNew,
  saveStatus,
  isUploadingCard,
  cardError,
  pendingPreviewUrl,
  onBack,
  onPatch,
  onImageSelect,
  onImageClear,
  onDelete,
  onFlushPersist,
  onDone,
}) => {
  const [stepError, setStepError] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const validateStep = useCallback(
    (step) => {
      const name = card.name?.trim() || '';
      const isCash = name.toLowerCase() === 'cash';

      if (step === 1 && !isCash) {
        if (!card.network) {
          setStepError('Select a payment network.');
          return false;
        }
        if (isAddingNew && !card.imageUrl) {
          setStepError('Upload a card photo.');
          return false;
        }
      }

      if (step === 2) {
        if (!name) {
          setStepError('Enter a card name.');
          return false;
        }
      }

      if (step === 3 && !isCash) {
        const cycle = card.billingCycle || { type: 'monthly' };
        if (cycle.type === 'statement') {
          const { statementStart, statementEnd, dueDate } = cycle.anchor || {};
          if (!statementStart || !statementEnd || !dueDate) {
            setStepError('Fill in all three statement dates.');
            return false;
          }
        }
      }

      setStepError(null);
      return true;
    },
    [card, isAddingNew]
  );

  const handleStepAdvance = async (step) => {
    if (!validateStep(step)) return false;
    await onFlushPersist();
    return true;
  };

  const handleFinalStep = async () => {
    if (!validateStep(2)) return false;
    if (!validateStep(3)) return false;
    setIsFinishing(true);
    const ok = await onFlushPersist();
    setIsFinishing(false);
    if (!ok) {
      setStepError('Could not save card. Check your connection and try again.');
      return false;
    }
    onDone();
    return true;
  };

  return (
    <motion.div className="form-page" variants={fadeUp} initial="hidden" animate="show">
      <button type="button" className="btn btn-ghost settings-back-btn" onClick={onBack}>
        <ArrowLeft size={18} />
        Back to settings
      </button>

      <PageHeader
        eyebrow="Payment methods"
        title={isAddingNew ? 'Add card' : 'Edit card'}
        subtitle="Changes save automatically as you fill in each step."
        action={<SaveIndicator status={isUploadingCard ? 'saving' : saveStatus} />}
      />

      <motion.div variants={fadeUp}>
        <motion.div {...scaleIn}>
          <AnimatePresence>
            {stepError && (
              <motion.div
                className="inline-error"
                style={{ marginBottom: 16 }}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
              >
                {stepError}
              </motion.div>
            )}
          </AnimatePresence>

          <Stepper
            initialStep={1}
            onBeforeNext={handleStepAdvance}
            onFinalStepCompleted={handleFinalStep}
            backButtonText="Back"
            nextButtonText="Continue"
            completeButtonText={isFinishing ? 'Finishing…' : 'Done'}
            nextButtonProps={{ disabled: isFinishing || isUploadingCard }}
            backButtonProps={{ disabled: isFinishing || isUploadingCard }}
          >
            <Step>
              <div className="step-heading">
                <h2>Card photo</h2>
                <p>Upload a picture and pick the payment network.</p>
              </div>
              <CardForm
                step={1}
                card={card}
                isAddingNew={isAddingNew}
                cardError={cardError}
                pendingPreviewUrl={pendingPreviewUrl}
                onPatch={onPatch}
                onImageSelect={onImageSelect}
                onImageClear={onImageClear}
              />
            </Step>

            <Step>
              <div className="step-heading">
                <h2>Card details</h2>
                <p>Name, last four digits, and reward currency.</p>
              </div>
              <CardForm step={2} card={card} onPatch={onPatch} />
            </Step>

            <Step>
              <div className="step-heading">
                <h2>Billing cycle</h2>
                <p>How statement periods are calculated for this card.</p>
              </div>
              <CardForm step={3} card={card} onPatch={onPatch} />
            </Step>

            <Step>
              <div className="step-heading">
                <h2>Reward multipliers</h2>
                <p>Earning rates per spending category.</p>
              </div>
              <CardForm step={4} card={card} onPatch={onPatch} />
            </Step>

            <Step>
              <div className="step-heading">
                <h2>Review</h2>
                <p>Your card is saved — confirm and finish.</p>
              </div>
              <CardReview card={card} />
              {!isAddingNew && (
                <button
                  type="button"
                  className="btn btn-ghost card-delete-btn"
                  onClick={onDelete}
                >
                  <Trash2 size={18} />
                  Delete card
                </button>
              )}
            </Step>
          </Stepper>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default CardEditorFlow;
