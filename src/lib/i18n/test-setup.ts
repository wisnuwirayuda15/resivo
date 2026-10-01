/**
 * Starts i18next for the unit tests.
 *
 * `useTranslation` finds the instance through `initReactI18next`, which is
 * registered by importing it, so a test that renders a component with no
 * provider still gets English sentences and not keys. English is what every
 * existing assertion about the interface was written against.
 */
import "./index";
