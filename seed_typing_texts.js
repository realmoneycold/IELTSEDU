const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const practiceTexts = [
  {
    title: 'Getting Started with Typing',
    content: 'Learning to type quickly is a valuable skill in the modern world. With regular practice, anyone can become a confident and fast typist. Keep your fingers on the home row and do not look down at the keyboard.',
    difficulty: 'beginner',
    wordCount: 37,
    topics: 'typing,basics,education',
    isActive: true
  },
  {
    title: 'The Home Row Keys',
    content: 'The home row keys are the foundation of touch typing. Your left hand fingers should rest on A, S, D, and F. Your right hand fingers should rest on J, K, L, and semicolon. Practice pressing each key gently without moving your hands too much.',
    difficulty: 'beginner',
    wordCount: 46,
    topics: 'home row,touch typing,basics',
    isActive: true
  },
  {
    title: 'Importance of regular practice',
    content: 'Consistency is the key to mastering touch typing. Spending just fifteen minutes every day can lead to significant improvements in your typing speed and accuracy within a few weeks. Focus on precision first, and speed will naturally follow.',
    difficulty: 'intermediate',
    wordCount: 41,
    topics: 'practice,consistency,skills',
    isActive: true
  },
  {
    title: 'Benefits of High Speed Typing',
    content: 'Fast typing boosts your daily productivity by allowing you to write emails, documents, and code much faster. It reduces cognitive load, meaning you can focus entirely on expressing your thoughts rather than struggling with the keyboard interface.',
    difficulty: 'intermediate',
    wordCount: 41,
    topics: 'productivity,benefits,typing',
    isActive: true
  },
  {
    title: 'Evolution of Keyboards',
    content: 'The QWERTY keyboard layout was originally designed for mechanical typewriters in the late nineteenth century. It was created to prevent typebars from jamming by placing frequently used letter pairs far apart from each other. Today, alternative layouts like Dvorak and Colemak aim to optimize finger movement for faster typing speeds and reduced ergonomic strain.',
    difficulty: 'advanced',
    wordCount: 60,
    topics: 'history,keyboards,technology',
    isActive: true
  },
  {
    title: 'Artificial Intelligence and Natural Language',
    content: 'Natural language processing is a fascinating subfield of artificial intelligence that focuses on the complex interaction between computer systems and human language. By training neural networks on massive datasets of text, modern AI models can generate highly coherent articles, translate between complex languages, and even hold natural conversations with humans.',
    difficulty: 'advanced',
    wordCount: 56,
    topics: 'ai,technology,language',
    isActive: true
  }
];

async function main() {
  console.log('🌱 Seeding typing practice texts...');
  
  for (const text of practiceTexts) {
    const created = await prisma.typingPracticeText.create({
      data: text
    });
    console.log(`✅ Created: "${created.title}" (${created.difficulty})`);
  }
  
  console.log('🎉 Seeding complete!');
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
