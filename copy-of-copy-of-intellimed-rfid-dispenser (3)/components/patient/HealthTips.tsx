
import React, { useState, useEffect } from 'react';

const healthTips: { [key: number]: { title: string; message: string } } = {
  6: { title: "Good Morning!", message: "Time to wake up! A glass of water is a great way to start your day." },
  7: { title: "Rise and Shine", message: "Consider some light stretching to get your body moving and ready for the day." },
  8: { title: "Breakfast Time", message: "Fuel your body with a nutritious breakfast. Oats, fruits, or eggs are excellent choices." },
  9: { title: "Morning Focus", message: "Hydrate! Keep a water bottle handy to sip throughout the morning." },
  10: { title: "Take a Short Break", message: "Step away from your screen. Look out a window for a minute to rest your eyes." },
  11: { title: "Mid-Morning Snack", message: "Feeling peckish? A piece of fruit or a handful of nuts can boost your energy." },
  12: { title: "Lunch Hour", message: "Enjoy a balanced lunch. Include some protein, carbs, and plenty of vegetables." },
  13: { title: "Post-Lunch Walk", message: "A short walk after lunch can aid digestion and improve your mood." },
  14: { title: "Stay Hydrated", message: "Afternoon slump? A glass of cold water can be more refreshing than you think." },
  15: { title: "Stretch it Out", message: "Stand up and stretch your arms and legs to prevent stiffness." },
  16: { title: "Healthy Snack", message: "A cup of yogurt or some vegetable sticks are great options for a healthy afternoon snack." },
  17: { title: "Wind Down Work", message: "Start to wrap up your work for the day. Plan what you need to do tomorrow." },
  18: { title: "Dinner Prep", message: "Time to think about a light and healthy dinner. Avoid heavy, oily foods." },
  19: { title: "Dinner Time", message: "Enjoy your evening meal. Eating slowly helps with digestion." },
  20: { title: "Relax and Unwind", message: "Disconnect from screens. Read a book, listen to music, or chat with family." },
  21: { title: "Prepare for Sleep", message: "Dim the lights and create a calm environment to signal your body it's time to sleep." },
  22: { title: "Good Night", message: "Time for a restful sleep. Sweet dreams and recharge for tomorrow!" },
};

const HealthTips: React.FC = () => {
  const [currentTip, setCurrentTip] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    const updateTip = () => {
      const currentHour = new Date().getHours();
      if (currentHour >= 6 && currentHour <= 22) {
        setCurrentTip(healthTips[currentHour]);
      } else {
        setCurrentTip(null);
      }
    };

    updateTip();
    const intervalId = setInterval(updateTip, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, []);

  if (!currentTip) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-4 rounded-lg shadow-lg animate-fade-in-down">
      <h3 className="font-bold text-lg">{currentTip.title}</h3>
      <p>{currentTip.message}</p>
    </div>
  );
};

export default HealthTips;
