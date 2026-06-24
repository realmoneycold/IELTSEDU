const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seedTypingTexts() {
  console.log("🌱 Seeding typing practice texts from prompt...");
  
  await prisma.typingPracticeText.createMany({
    data: [
      {
        title: "Architecture and Sustainability",
        content: "The development of sustainable architecture has become increasingly vital as global populations continue to rise and resources become scarcer. Academic research suggests that buildings contribute to approximately forty percent of energy consumption worldwide. By implementing green roofs, solar panels, and efficient insulation, architects can significantly reduce the carbon footprint of urban environments while enhancing the quality of life for residents.",
        difficulty: "intermediate",
        wordCount: 180,
        topics: "Academic,Environment",
        isActive: true
      },
      {
        title: "Climate Change Solutions",
        content: "Global warming represents one of the most pressing challenges of the twenty-first century, requiring a coordinated international response. Transitioning to renewable energy sources, such as wind and solar power, is a critical step in reducing greenhouse gas emissions. Additionally, reforestation projects and the protection of biodiversity are essential for maintaining the Earths ecological balance and ensuring a sustainable future for the next generation.",
        difficulty: "advanced",
        wordCount: 220,
        topics: "Environment,Science",
        isActive: true
      },
      {
        title: "Education in the Digital Age",
        content: "The integration of technology into the classroom has transformed the landscape of modern education. Digital tools allow for personalized learning experiences, enabling students to progress at their own pace and explore subjects in greater depth. However, this shift also demands new digital literacy skills from both teachers and students, as they navigate an increasingly complex information environment.",
        difficulty: "beginner",
        wordCount: 150,
        topics: "Education,Technology",
        isActive: true
      },
      {
        title: "The Benefits of Regular Exercise",
        content: "Physical activity is widely recognized as a cornerstone of a healthy lifestyle, offering numerous benefits for both the body and the mind. Engaging in regular exercise can improve cardiovascular health, strengthen muscles, and boost the immune system. Furthermore, physical activity has been shown to reduce stress levels and enhance cognitive function, making it an essential practice for overall well-being.",
        difficulty: "beginner",
        wordCount: 140,
        topics: "Health,Lifestyle",
        isActive: true
      },
      {
        title: "Artificial Intelligence and Ethics",
        content: "As artificial intelligence continues to advance, the ethical implications of its use have become a subject of intense debate. Issues such as algorithmic bias, data privacy, and the potential for job displacement require careful consideration and regulation. Ensuring that AI systems are developed and deployed in a transparent and accountable manner is crucial for building public trust and maximizing the benefits of this technology.",
        difficulty: "advanced",
        wordCount: 190,
        topics: "Technology,Ethics",
        isActive: true
      }
    ]
  });
  
  console.log("✅ Seeding completed!");
}

seedTypingTexts()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
