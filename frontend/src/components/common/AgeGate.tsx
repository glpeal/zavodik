import { useUIStore } from '@/stores/uiStore'
import { Modal } from '@/components/ui'
import { Button } from '@/components/ui'

export function AgeGate() {
  const { ageGateAccepted, acceptAgeGate } = useUIStore()

  if (ageGateAccepted) return null

  return (
    <Modal isOpen={!ageGateAccepted} onClose={() => {}} title="Возрастное ограничение" size="sm">
      <div className="text-center space-y-4">
        <div className="text-6xl font-bold text-primary-500">18+</div>
        <p className="text-gray-300 text-sm">
          Данный сайт предназначен только для лиц, достигших 18-летнего возраста.
          Подтвердите, что вам исполнилось 18 лет.
        </p>
        <p className="text-xs text-gray-500">
          Азартные игры могут вызывать зависимость. Играйте ответственно.
        </p>
        <div className="flex gap-3">
          <Button variant="primary" fullWidth onClick={acceptAgeGate}>
            Мне есть 18 лет
          </Button>
          <Button variant="outline" fullWidth onClick={() => window.location.href = 'https://google.com'}>
            Мне нет 18 лет
          </Button>
        </div>
      </div>
    </Modal>
  )
}
