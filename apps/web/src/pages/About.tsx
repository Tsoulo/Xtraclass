import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  Lightbulb, 
  Users, 
  Rocket, 
  Heart, 
  GraduationCap, 
  Globe, 
  Target,
  Microscope,
  Code,
  Stethoscope,
  ArrowRight
} from "lucide-react";
import logoImage from "@assets/xtraclass-logo-td.png";

export default function About() {
  const [, setLocation] = useLocation();

  const values = [
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "We leverage cutting-edge AI technology to create personalized learning experiences that adapt to each student's unique needs and pace.",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: Users,
      title: "Inclusivity",
      description: "Education is a right, not a privilege. We're committed to making quality STEM education accessible to every African student, regardless of their background.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Heart,
      title: "Excellence",
      description: "We're dedicated to maintaining the highest standards in educational content, technology, and support to ensure every student reaches their full potential.",
      color: "from-red-500 to-pink-500"
    },
    {
      icon: Globe,
      title: "Pan-African Vision",
      description: "From Cape Town to Cairo, we're building a unified platform that celebrates African diversity while fostering continental collaboration in education.",
      color: "from-green-500 to-emerald-500"
    }
  ];

  const focus = [
    {
      icon: Microscope,
      title: "Future Scientists",
      description: "Nurturing the next generation of researchers, biologists, chemists, and physicists who will solve Africa's most pressing challenges.",
      gradient: "from-purple-600 to-blue-600"
    },
    {
      icon: Stethoscope,
      title: "Future Doctors",
      description: "Empowering aspiring healthcare professionals with strong foundations in biology, chemistry, and critical thinking skills.",
      gradient: "from-red-600 to-pink-600"
    },
    {
      icon: Code,
      title: "Future Engineers",
      description: "Preparing the innovators who will build Africa's infrastructure, develop new technologies, and lead the continent's digital revolution.",
      gradient: "from-blue-600 to-cyan-600"
    }
  ];

  const impact = [
    {
      number: "54",
      label: "Countries Across Africa",
      description: "Building a continental movement"
    },
    {
      number: "1.3B",
      label: "People to Impact",
      description: "The African population we serve"
    },
    {
      number: "60%",
      label: "Youth Population",
      description: "Under 25, ready to learn"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button onClick={() => setLocation('/')} className="flex items-center gap-2">
              <img src={logoImage} alt="XtraClass.ai" className="h-8" />
            </button>
            <Button 
              onClick={() => setLocation('/home')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-10"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Transforming African Education
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 mb-8 leading-relaxed">
              Africa's first AI-powered learning platform, dedicated to empowering the next generation 
              of doctors, engineers, and scientists across the continent.
            </p>
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <GraduationCap className="w-6 h-6" />
              <span className="text-lg">Building Africa's Future, One Student at a Time</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <Target className="w-16 h-16 mx-auto mb-4 text-purple-600" />
              <h2 className="text-4xl font-bold mb-6 text-gray-900">Our Mission</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                XtraClass.ai was born from a simple yet powerful belief: <strong>every African child deserves 
                access to world-class STEM education</strong>. We're on a mission to bridge the educational gap, 
                providing personalized, AI-driven learning experiences that prepare students for careers in 
                medicine, engineering, technology, and scientific research.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                By combining cutting-edge artificial intelligence with deep understanding of African curricula 
                and learning contexts, we're creating the tools that will empower millions of students to 
                achieve their dreams and contribute to Africa's growth and development.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Focus Areas */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Empowering Africa's Future Leaders
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're building the foundation for Africa's next generation of professionals
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {focus.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ scale: 1.05, y: -10 }}
              >
                <Card className="p-8 h-full text-center hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-purple-300">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${item.gradient} flex items-center justify-center mx-auto mb-6`}>
                    <item.icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 text-gray-900">Our Core Values</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                <Card className="p-6 h-full hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-lg bg-gradient-to-r ${value.color} flex items-center justify-center flex-shrink-0`}>
                      <value.icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-gray-900">{value.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{value.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 text-white">
              The African Opportunity
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              We're positioned at the heart of the world's youngest and fastest-growing continent
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {impact.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="text-center"
              >
                <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 transition-all duration-300">
                  <div className="text-6xl font-bold text-white mb-2">{stat.number}</div>
                  <div className="text-xl font-semibold text-white mb-2">{stat.label}</div>
                  <div className="text-white/80">{stat.description}</div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <Rocket className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <h2 className="text-4xl font-bold mb-6 text-gray-900">Our Vision for 2030</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                By 2030, we envision XtraClass.ai as the leading educational platform across Africa, 
                having empowered <strong>10 million students</strong> to pursue careers in STEM fields. 
                We see a continent where:
              </p>
              <div className="text-left max-w-2xl mx-auto space-y-4 text-gray-700">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-600 mt-2 flex-shrink-0"></div>
                  <p>Every student has access to personalized AI tutoring, regardless of their location or economic background</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-600 mt-2 flex-shrink-0"></div>
                  <p>African universities are filled with well-prepared STEM students ready to excel in medicine, engineering, and technology</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-600 mt-2 flex-shrink-0"></div>
                  <p>African innovations in healthcare, infrastructure, and technology are solving local and global challenges</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-600 mt-2 flex-shrink-0"></div>
                  <p>The brain drain is reversed as talented Africans stay home to build and innovate on the continent</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Join Us in Building Africa's Future
            </h2>
            <p className="text-xl text-gray-700 mb-8">
              Whether you're a student, parent, or educator, you're part of this transformative journey.
            </p>
            <Button 
              size="lg"
              onClick={() => setLocation('/home')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6"
            >
              Start Your Journey Today
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <img src={logoImage} alt="XtraClass.ai" className="h-8 mx-auto mb-4 brightness-0 invert" />
            <p className="text-gray-400 text-sm">
              &copy; 2025 XtraClass.ai. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
