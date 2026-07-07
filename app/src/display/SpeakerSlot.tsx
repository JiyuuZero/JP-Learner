// Pronunciación / TTS speaker slot (TTS-01/02) — Plan 06 wires Web Speech
// synthesis + ja-JP voice detection here. Until then the slot renders nothing:
// the UI-SPEC mandates the speaker button is HIDDEN (not disabled) when no
// usable ja-JP voice exists, and no voice handling exists before Plan 06.
// Every surface that will speak (flashcards, item detail) already mounts this
// slot, so Plan 06 only has to implement this one component.
export default function SpeakerSlot(_props: { text: string }) {
  return null
}
