import { Text, type TextProps } from "react-native";

type Props = TextProps & {
  text: string;
  /** Porzione di `text` da evidenziare (case-insensitive, primo match). */
  highlight: string;
  highlightClassName?: string;
};

/**
 * Testo con la prima occorrenza di `highlight` evidenziata (case-insensitive),
 * usato nei risultati di ricerca live per mostrare a colpo d'occhio dove
 * il termine cercato ha fatto match.
 */
export default function HighlightText({
  text,
  highlight,
  highlightClassName = "bg-yellow-200 text-gray-900 dark:bg-yellow-500/40 dark:text-white",
  className,
  ...rest
}: Props) {
  const trimmed = highlight.trim();
  if (!trimmed) {
    return (
      <Text className={className} {...rest}>
        {text}
      </Text>
    );
  }

  const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index === -1) {
    return (
      <Text className={className} {...rest}>
        {text}
      </Text>
    );
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + trimmed.length);
  const after = text.slice(index + trimmed.length);

  return (
    <Text className={className} {...rest}>
      {before}
      <Text className={highlightClassName}>{match}</Text>
      {after}
    </Text>
  );
}
