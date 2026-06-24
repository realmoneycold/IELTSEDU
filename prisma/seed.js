const { PrismaClient, Role, PartnerStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

if (process.env.NODE_ENV === 'production') {
  console.error('❌ Cannot seed production database');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  // Clear existing users to ensure clean state
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['ceo@ieltspractice.com', 'admin@ieltspractice.com']
      }
    }
  });

  // Plaintext passwords for local testing only
  const ceoPlainPassword = 'CeoPass123!';
  const adminPlainPassword = 'AdminPass123!';

  const [ceoPasswordHash, adminPasswordHash] = await Promise.all([
    bcrypt.hash(ceoPlainPassword, 10),
    bcrypt.hash(adminPlainPassword, 10),
  ]);

  // 1. CEO Account
  const ceo = await prisma.user.create({
    data: {
      full_name: "CEO Account",
      email: 'ceo@ieltspractice.com',
      password: ceoPasswordHash,
      country: 'Uzbekistan',
      role: Role.CEO,
      is_verified: true,
      current_band: 9.0,
      tasks_done: 0,
    },
  });

  // 2. Admin Account
  const admin = await prisma.user.create({
    data: {
      full_name: "Admin Account",
      email: 'admin@ieltspractice.com',
      password: adminPasswordHash,
      country: 'Uzbekistan',
      role: Role.ADMIN,
      is_verified: true,
      current_band: 8.0,
      tasks_done: 0,
    },
  });

  // 3. Typing Practice Texts
  const typingTexts = [
    {
      title: "Architecture and Sustainability",
      content: "The development of sustainable architecture has become increasingly vital in recent years. Architects are now focusing on creating buildings that minimize environmental impact through efficient use of energy, water, and materials. This involves incorporating renewable energy sources, such as solar panels and wind turbines, and utilizing recycled or locally sourced materials. Furthermore, sustainable design often includes features like green roofs and natural ventilation systems to reduce the need for artificial heating and cooling. As urbanization continues to rise, the integration of sustainability into architectural practices is essential for mitigating climate change and promoting a healthier, more resilient built environment for future generations.",
      difficulty: "intermediate",
      wordCount: 118,
      topics: "Academic,Environment,Architecture",
      isActive: true
    },
    {
      title: "Climate Change Solutions",
      content: "Global warming represents one of the most pressing challenges facing humanity today. Addressing this complex issue requires a multi-faceted approach involving international cooperation, technological innovation, and individual action. One key strategy is the transition from fossil fuels to clean, renewable energy sources like wind, solar, and hydroelectric power. Additionally, reforestation and the protection of existing forests play a crucial role in absorbing carbon dioxide from the atmosphere. Governments can also implement policies such as carbon pricing and stricter emission standards for industries. Ultimately, a combination of large-scale systemic changes and everyday sustainable choices is necessary to reduce greenhouse gas emissions and protect our planet's future.",
      difficulty: "advanced",
      wordCount: 120,
      topics: "Environment,Science,Climate",
      isActive: true
    },
    {
      title: "The Importance of Biodiversity",
      content: "Biodiversity is the variety of life on Earth, encompassing all species of plants, animals, and microorganisms, as well as the ecosystems they form. It provides essential services that support human life, including food production, water purification, and climate regulation. However, human activities such as habitat destruction, pollution, and overexploitation are leading to an unprecedented rate of species extinction. Protecting biodiversity is not only a moral imperative but also a practical necessity for maintaining the stability and productivity of our planet. Conservation efforts must focus on preserving natural habitats, restoring degraded ecosystems, and promoting sustainable management of natural resources to ensure that future generations can continue to benefit from the richness of life on Earth.",
      difficulty: "advanced",
      wordCount: 124,
      topics: "Biology,Environment,Nature",
      isActive: true
    },
    {
      title: "Digital Transformation in Education",
      content: "The landscape of education is undergoing a profound transformation driven by digital technology. Online learning platforms, interactive software, and mobile applications are providing students with unprecedented access to information and educational resources. This shift allows for more personalized learning experiences, as students can progress at their own pace and explore topics that interest them. Teachers are also using digital tools to enhance classroom instruction and facilitate collaboration among students. While digital transformation offers many benefits, it also presents challenges, such as the digital divide and the need for new pedagogical approaches. Ensuring that all students have equal access to technology and developing digital literacy skills are crucial for preparing them for success in the 21st century.",
      difficulty: "intermediate",
      wordCount: 130,
      topics: "Technology,Education,Digital",
      isActive: true
    },
    {
      title: "The History of the Olympic Games",
      content: "The Olympic Games have a long and storied history, dating back to ancient Greece. The first recorded Olympic Games were held in 776 BC in Olympia, as a festival to honor the god Zeus. These ancient games featured various athletic competitions, including running, wrestling, and chariot racing. The modern Olympic Games were revived in 1896 by Pierre de Coubertin, who envisioned them as a way to promote international understanding and peace through sport. Today, the Olympics are a global event, bringing together thousands of athletes from around the world to compete in a wide range of summer and winter sports. The Games continue to inspire people with their message of excellence, friendship, and respect.",
      difficulty: "beginner",
      wordCount: 128,
      topics: "History,Sports,Culture",
      isActive: true
    },
    {
      title: "The Benefits of Regular Exercise",
      content: "Regular physical activity is one of the most important things you can do for your health. It can help you manage your weight, reduce your risk of chronic diseases such as heart disease and diabetes, and strengthen your bones and muscles. Exercise also has significant mental health benefits, including reducing stress, anxiety, and depression. Whether it's a brisk walk, a swim, or a yoga session, finding an activity you enjoy and making it a part of your daily routine can greatly improve your overall well-being. Aim for at least 150 minutes of moderate-intensity aerobic activity per week, along with muscle-strengthening activities on two or more days. The rewards of staying active are well worth the effort.",
      difficulty: "beginner",
      wordCount: 126,
      topics: "Health,Fitness,Lifestyle",
      isActive: true
    },
    {
      title: "Artificial Intelligence in Healthcare",
      content: "Artificial Intelligence (AI) is revolutionizing the healthcare industry by enhancing diagnostic accuracy, personalizing treatment plans, and improving patient outcomes. AI algorithms can analyze vast amounts of medical data, including imaging and genomic information, to identify patterns that might be missed by human clinicians. This technology is being used to detect diseases like cancer at earlier stages and to develop more effective drugs and therapies. Furthermore, AI-powered virtual assistants and chatbots are providing patients with 24/7 support and personalized health advice. While AI offers immense potential, it also raises ethical concerns regarding data privacy and the role of human judgment in medical decision-making. As AI continues to evolve, its integration into healthcare must be carefully managed to ensure it benefits all patients.",
      difficulty: "advanced",
      wordCount: 132,
      topics: "Technology,Healthcare,AI",
      isActive: true
    },
    {
      title: "The Future of Space Exploration",
      content: "Space exploration has entered a new era, with both government agencies and private companies working to reach new frontiers. Missions to Mars, the establishment of lunar bases, and the search for extraterrestrial life are among the ambitious goals of current and future space programs. Advances in rocket technology and robotics are making these missions more feasible and cost-effective. Additionally, space exploration has the potential to yield significant scientific discoveries and technological innovations that can benefit life on Earth. However, the challenges of long-duration space travel, including radiation exposure and resource management, remain significant. As we look to the stars, international collaboration and a shared vision for the peaceful use of space will be essential for the continued success of our journey into the cosmos.",
      difficulty: "intermediate",
      wordCount: 134,
      topics: "Science,Space,Future",
      isActive: true
    }
  ];

  await prisma.typingPracticeText.createMany({
    data: typingTexts,
    skipDuplicates: true,
  });

  // 4. Education Centres with Locations
  const centres = [
    {
      name: "British Council Tashkent",
      code: "BC-TAS",
      city: "Tashkent",
      country: "Uzbekistan",
      address: "107 Amir Temur Avenue",
      latitude: 41.3111,
      longitude: 69.2406,
      phone: "+998 71 1234567",
      website: "https://britishcouncil.uz",
      isActive: true,
      rating: 4.8,
    },
    {
      name: "IDP IELTS Tashkent",
      code: "IDP-TAS-01",
      city: "Tashkent",
      country: "Uzbekistan",
      address: "45 Oybek Street, Tashkent",
      latitude: 41.2995,
      longitude: 69.2664,
      phone: "+998 71 2000202",
      website: "https://idp.uz",
      isActive: true,
      rating: 4.7,
    },
    {
      name: "IELTS Zone Tashkent",
      code: "IZ-TAS-01",
      city: "Tashkent",
      country: "Uzbekistan",
      address: "Chilonzor 1, Tashkent",
      latitude: 41.2827,
      longitude: 69.2041,
      phone: "+998 90 1234567",
      website: "https://ieltszone.uz",
      isActive: true,
      rating: 4.9,
    },
    {
      name: "Innovative Centre Samarkand",
      code: "INN-SAM",
      city: "Samarkand",
      country: "Uzbekistan",
      address: "12 Registon Street",
      latitude: 39.6542,
      longitude: 66.9597,
      phone: "+998 66 1234567",
      website: "https://innovative.uz",
      isActive: true,
      rating: 4.9,
    },
    {
      name: "Education First Bukhara",
      code: "EF-BUK-01",
      city: "Bukhara",
      country: "Uzbekistan",
      address: "B. Naqshband Street, Bukhara",
      latitude: 39.7747,
      longitude: 64.4286,
      phone: "+998 65 1234567",
      website: "https://efbukhara.uz",
      isActive: true,
      rating: 4.5
    }
  ];

  for (const c of centres) {
    await prisma.educationCentre.upsert({
      where: { code: c.code },
      update: c,
      create: c
    });
  }

  console.log(`Seed completed successfully! Added/Updated ${typingTexts.length} typing practice texts and ${centres.length} centres.`);
  console.log('Seeding only allowed in development');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

