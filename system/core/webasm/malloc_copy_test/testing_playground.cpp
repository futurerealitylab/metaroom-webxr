#ifdef EXTERN_C
#undef EXTERN_C

#define GLM_FORCE_ALIGNED_GENTYPES
#include <glm/glm.hpp>

namespace gmath = glm;

char* malloc_copy(char* input)
{   
    usize len = strlen(input) + 1;

    char* result = (char*)malloc(len);
    if (result == NULL) {
        return NULL;
    }

    strncpy(result, input, len);

    return result;
}

void malloc_free(char* input)
{
    free(input);
}

float32 my_sin(float32 val) 
{   
    float32 result = sinf(val);

    float32 result_times_2 = print_num(result);

    print_num(result_times_2);

    return result;
}

long fibonacci(unsigned n) {
    if (n < 2) return n;
    return fibonacci(n-1) + fibonacci(n-2);
}

void set_char(char* input)
{
    input[0] = '\'';

    uint8 fibonacci_series[] = { 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 };
    for (uint8 number : fibonacci_series) {
        input[0] = number;
    }

    auto WEE = make_BLA<int>();
    WEE.x = 18;

    gmath::vec4 v(100.0f, 200.0f, 300.0f, 1.0f);

    gmath::vec4 v_out = gmath::mat4(1.0f) * v;

    Bla_C Y = Bla_C(input[1], (float)input[2]);

    input[0] = (int)std::is_pod<BLA<int>>::value + Y.x + 5 + static_cast<int>(v_out.x) * input[1];

    auto X = new BLA<uint8>();

    //v2.push_back(2);

    //delete X;



    const bool branch_a = true;

    when (branch_a) {

    } else {

    }
}

#else

template <typename T>
struct BLA {
    T x;
};
template <typename T>
BLA<T> make_BLA() {
    BLA<T> bla;
    return bla;
}

struct Bla_C {
    int x;
    float y;
    Bla_C(int x_, float y_) : x(x_), y(y_) {}
};

float32 sin01(float32 val)
{
    return (sinf(val) + 1.0) / 2.0;
}
#include <vector>

float64 sin01(float64 val)
{
    return (sin(val) + 1.0) / 2.0;
}


#endif
