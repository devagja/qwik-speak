import { useStore, useContextProvider, useMount$, useClientEffect$ } from '@builder.io/qwik';
import { isServer } from '@builder.io/qwik/build';

import type { SpeakConfig, TranslateFn, SpeakState } from './types';
import { getUserLanguage$, handleMissingTranslation$, getTranslation$, getLocale$, SpeakContext, setLocale$ } from './constants';
import { loadTranslation, resolveLocale } from './core';
import { qDev } from './utils';

/**
 * Creates a new Speak context, resolves the locale & loads translation data
 * @param config Speak configuration
 * @param translateFn Translation functions to be used
 * @returns The context
 */
export const useSpeak = (config: SpeakConfig, translateFn: TranslateFn = {}): SpeakState => {
    // Assign functions
    translateFn.getTranslation$ = translateFn.getTranslation$ ?? getTranslation$;
    translateFn.getUserLanguage$ = translateFn.getUserLanguage$ ?? getUserLanguage$;
    translateFn.setLocale$ = translateFn.setLocale$ ?? setLocale$;
    translateFn.getLocale$ = translateFn.getLocale$ ?? getLocale$;
    translateFn.handleMissingTranslation$ = translateFn.handleMissingTranslation$ ?? handleMissingTranslation$;

    // Set initial state
    const state = useStore<SpeakState>({
        locale: {},
        translation: {},
        config: config,
        translateFn: translateFn
    }, { recursive: true });
    const { locale, translation } = state;

    useContextProvider(SpeakContext, state);

    // Will block the rendering until callback resolves
    useMount$(async () => {
        // Resolve the locale
        const userLocale = await resolveLocale(translateFn, config);

        // Load translation data
        const newTranslation = await loadTranslation(userLocale.language, state);

        // Update state
        Object.assign(translation, newTranslation);
        Object.assign(locale, userLocale);

        // Prevent Qwik from creating subscriptions
        if (isServer) {
            Object.freeze(translation);
            Object.freeze(config);
            Object.freeze(translateFn)
        }

        if (qDev) {
            console.debug('Qwik Speak', '', 'Translation loaded');
        }
    });

    useClientEffect$(async () => {
        // Store the locale
        await translateFn.setLocale$?.(locale);

        if (qDev) {
            console.debug('%cQwik Speak', 'background-color: #0093ee; color: #fff; padding: 2px 3px; border-radius: 2px; font-size: 0.8em;', state);
        }
    });

    return state;
};
