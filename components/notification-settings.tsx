"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { useState } from "react"

export function NotificationSettings() {
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(true)
  const [frequency, setFrequency] = useState("daily")
  const [daysBeforeDeadline, setDaysBeforeDeadline] = useState([7])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Canais de Notificação</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-notifications">Notificações por Email</Label>
            <p className="text-sm text-muted-foreground">Receba atualizações sobre licitações por email</p>
          </div>
          <Switch id="email-notifications" checked={emailEnabled} onCheckedChange={setEmailEnabled} />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sms-notifications">Notificações por SMS</Label>
            <p className="text-sm text-muted-foreground">Receba alertas importantes por SMS</p>
          </div>
          <Switch id="sms-notifications" checked={smsEnabled} onCheckedChange={setSmsEnabled} />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications">Notificações Push</Label>
            <p className="text-sm text-muted-foreground">Receba notificações no navegador</p>
          </div>
          <Switch id="push-notifications" checked={pushEnabled} onCheckedChange={setPushEnabled} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Frequência de Resumos</h3>

        <RadioGroup value={frequency} onValueChange={setFrequency}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="daily" id="daily" />
            <Label htmlFor="daily">Diário</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="weekly" id="weekly" />
            <Label htmlFor="weekly">Semanal</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="monthly" id="monthly" />
            <Label htmlFor="monthly">Mensal</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Alertas de Prazo</h3>
          <p className="text-sm font-medium">{daysBeforeDeadline[0]} dias antes</p>
        </div>

        <div className="px-1">
          <Slider value={daysBeforeDeadline} min={1} max={30} step={1} onValueChange={setDaysBeforeDeadline} />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">1 dia</span>
            <span className="text-xs text-muted-foreground">30 dias</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Receba alertas quando o prazo de uma licitação estiver se aproximando
        </p>
      </div>
    </div>
  )
}

