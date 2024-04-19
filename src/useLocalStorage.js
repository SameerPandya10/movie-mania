import { useState, useEffect } from "react";
export function useLocalStorage(initialState, stName) {
  const [value, setValue] = useState(function () {
    const storedMovies = localStorage.getItem(stName);
    return storedMovies ? JSON.parse(storedMovies) : initialState;
  });
  useEffect(
    function () {
      localStorage.setItem(stName, JSON.stringify(value));
    },
    [value, stName]
  );
  return [value, setValue];
}
