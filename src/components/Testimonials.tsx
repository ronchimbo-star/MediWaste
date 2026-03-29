import { Star } from 'lucide-react';

export default function Testimonials() {
  const testimonials = [
    {
      name: 'Dr. Sarah Johnson',
      role: 'Practice Manager',
      content: 'MediWaste has been exceptional. Their service is reliable, professional, and completely compliant with all regulations. Highly recommended!',
      rating: 5
    },
    {
      name: 'Michael Brown',
      role: 'Clinic Director',
      content: 'Outstanding service from start to finish. The team is knowledgeable and the collection process is seamless.',
      rating: 5
    },
    {
      name: 'Emma Wilson',
      role: 'Dental Practice Owner',
      content: 'We switched to MediWaste a year ago and have been impressed with their professionalism and competitive pricing.',
      rating: 5
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What Our Clients Say
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Trusted by healthcare facilities across the South East
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-4">"{testimonial.content}"</p>
              <div>
                <p className="font-semibold text-gray-900">{testimonial.name}</p>
                <p className="text-sm text-gray-600">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
