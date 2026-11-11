import { useState } from "react";

/** The current time, read once when the component first renders (enough to sort upcoming from past). */
export const useNowOnce = () => useState(() => Date.now())[0];
